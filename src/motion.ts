const easeOutPoints = [0.23, 1, 0.32, 1] as const;

export const EASE_OUT_CSS = `cubic-bezier(${easeOutPoints.join(", ")})`;
export const CAMERA_RESET_DURATION = 200;

export function easeOut(progress: number) {
	if (progress <= 0) return 0;
	if (progress >= 1) return 1;
	const [x1, y1, x2, y2] = easeOutPoints;
	const sample = (t: number, a: number, b: number) =>
		3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
	let low = 0;
	let high = 1;
	for (let i = 0; i < 16; i++) {
		const t = (low + high) / 2;
		if (sample(t, x1, x2) < progress) low = t;
		else high = t;
	}
	return sample((low + high) / 2, y1, y2);
}
