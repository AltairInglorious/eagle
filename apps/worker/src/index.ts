import * as sysinfo from "systeminformation";
import { getEnv, getEnvNumber } from "@common/env";

const SCRAPE_INTERVAL = getEnvNumber("SCRAPE_INTERVAL", 1000 * 60, {
	min: 10_000,
});
const DISK_MOUNT = getEnv("DISK_MOUNT", "/");
const EAGLE_URL = getEnv("EAGLE_URL");
const EAGLE_TOKEN = getEnv("EAGLE_TOKEN");

async function gatherLoadInfo() {
	const [mem, disks, cpu] = await Promise.all([
		sysinfo.mem(),
		sysinfo.fsSize(),
		sysinfo.currentLoad(),
	]);

	const disk = disks.find((v) => v.mount === DISK_MOUNT);
	if (!disk) {
		console.warn(
			`Can't find disk for mount ${DISK_MOUNT}, choose another DISK_MOUNT. Here is a available disks`,
			disks,
		);
	}

	return {
		ram: mem.available,
		disk: disk?.available,
		cpu: cpu.currentLoad,
	};
}

async function monitoringCycle() {
	try {
		const data = await gatherLoadInfo();

		const res = await fetch(EAGLE_URL, {
			method: "POST",
			body: JSON.stringify(data),
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${EAGLE_TOKEN}`,
			},
		});

		if (!res.ok)
			console.warn(`Eagle http error ${res.status}: ${await res.text()}`);
	} catch (e) {
		console.warn(`Error on monitoring cycle`, e);
	}
}

await monitoringCycle();
setInterval(monitoringCycle, SCRAPE_INTERVAL);
console.log(`Start monitoring every ${SCRAPE_INTERVAL / 1_000} seconds`);
