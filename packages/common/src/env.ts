export function getEnv(name: string, fallback?: string): string {
	const val = process.env[name] ?? fallback;
	if (!val) throw new Error(`${name} is not set`);
	return val;
}

export function getEnvNumber(
	name: string,
	fallback?: number,
	options?: { min?: number; max?: number },
): number {
	const val = process.env[name] ? Number(process.env[name]) : fallback;
	if (!val) throw new Error(`${name} is not set`);
	if (Number.isNaN(val)) throw new Error(`${name} must be a number`);
	if (options?.min && val < options.min)
		throw new Error(`${name} must be greater than ${options.min}`);
	if (options?.max && val > options.max)
		throw new Error(`${name} must be less than ${options.max}`);
	return val;
}
