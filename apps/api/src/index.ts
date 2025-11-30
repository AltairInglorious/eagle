import { getEnv, getEnvNumber } from "@common/env";
import { autoRetry } from "@grammyjs/auto-retry";
import { Bot } from "grammy";
import z from "zod";

const port = Number(getEnvNumber("PORT", 3000, { min: 1 }));
const bot = new Bot(getEnv("TG_BOT_TOKEN"));
bot.api.config.use(autoRetry());
const logChatID = getEnv("TG_CHAT");

const KB = 1024;
const MB = KB ** 2;
const GB = KB ** 3;

const reportSchema = z.object({
	ram: z.number().nonnegative(),
	disk: z.optional(z.number().nonnegative()),
	cpu: z.number().nonnegative(),
});
const serverConfigSchema = z.object({
	name: z.string(),
	token: z.string(),
	limits: z.object({
		ram: z.number().nonnegative(),
		disk: z.number().nonnegative(),
		cpu: z.number().nonnegative(),
	}),
});
type Report = z.infer<typeof reportSchema>;
type ServerConfig = z.infer<typeof serverConfigSchema>;

const configData = z
	.array(serverConfigSchema)
	.safeParse(await Bun.file("config.json").json());

if (!configData.success) {
	console.error("Invalid config.json format", configData.error);
	process.exit(1);
}

const tokenMap = new Map<string, ServerConfig>();
for (const s of configData.data) {
	if (tokenMap.has(s.token)) {
		console.warn(
			`Duplication of token for two server configs: ${tokenMap.get(s.token)} and ${s}`,
		);
	} else {
		tokenMap.set(s.token, s);
		console.log(
			`Registered server ${s.name} with the next limits:
\tRAM: ${s.limits.ram / MB}M
\tCPU: ${s.limits.cpu}%
\tDisk: ${s.limits.disk / GB}G`,
		);
	}
}

async function notify(msg: string) {
	console.warn(msg);
	await bot.api.sendMessage(logChatID, msg);
}

async function handleReport(server: ServerConfig, report: Report) {
	console.log(`Got report for ${server.name}:`, report);
	if (report.ram < server.limits.ram) {
		notify(
			`Server ${server.name} has exced RAM limit [${server.limits.ram / MB}M]: ${report.ram / MB}M`,
		);
	}
	if (report.cpu > server.limits.cpu) {
		notify(
			`Server ${server.name} has exced CPU limit [${server.limits.cpu}%]: ${report.cpu}%`,
		);
	}
	if (!report.disk) {
		notify(`Server ${server.name} has not report about free disk space`);
	} else if (report.disk < server.limits.disk) {
		notify(
			`Server ${server.name} has exced disk space limit [${server.limits.disk / GB}G]: ${report.disk / GB}G`,
		);
	}
}

const server = Bun.serve({
	port,
	routes: {
		"/report": async (req: Request) => {
			const regAuth = /Bearer (.+)/.exec(
				req.headers.get("authorization") ?? "",
			);
			if (!regAuth || !regAuth[1]) {
				console.warn(
					`Invalid authorization token: ${req.headers.get("authorization")}`,
				);
				return new Response("Unauthorized", { status: 401 });
			}

			const serverConfig = tokenMap.get(regAuth[1]);
			if (!serverConfig) {
				console.warn(`No server config for token: ${regAuth[1]}`);
				return new Response("Unauthorized", { status: 401 });
			}

			const rawData = await req.json();
			const data = reportSchema.safeParse(rawData);
			if (!data.success) {
				console.warn(`Got invalid report: ${rawData}`);
				return new Response("Invalid report format", { status: 400 });
			}

			handleReport(serverConfig, data.data);
			return new Response("OK");
		},
	},
});
console.log(`HTTP server listen at ${server.hostname}:${server.port}`);
