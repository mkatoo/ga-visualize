type RGB = readonly [number, number, number];

// Viridis control points, softened against white to keep the population visible.
const VIRIDIS: readonly RGB[] = [
	[68, 1, 84],
	[72, 36, 117],
	[65, 68, 135],
	[53, 95, 141],
	[42, 120, 142],
	[33, 145, 140],
	[34, 168, 132],
	[68, 191, 112],
	[122, 209, 81],
	[189, 223, 38],
	[253, 231, 37],
];

const soften = (color: RGB): RGB =>
	color.map((channel) => Math.round(channel * 0.65 + 255 * 0.35)) as [
		number,
		number,
		number,
	];

const COLOR_STOPS = VIRIDIS.map(soften);

// Reuse a lookup table rather than interpolating colors for every heatmap pixel.
const PALETTE = Array.from({ length: 256 }, (_, index): RGB => {
	const position = (index / 255) * (COLOR_STOPS.length - 1);
	const lower = Math.min(Math.floor(position), COLOR_STOPS.length - 2);
	const fraction = position - lower;
	return COLOR_STOPS[lower].map((channel, component) =>
		Math.round(
			channel + (COLOR_STOPS[lower + 1][component] - channel) * fraction,
		),
	) as [number, number, number];
});

export const FITNESS_COLOR_GRADIENT = `linear-gradient(to right, ${COLOR_STOPS.map(
	(color, index) =>
		`rgb(${color.join(", ")}) ${(index / (COLOR_STOPS.length - 1)) * 100}%`,
).join(", ")})`;

export interface FitnessColorScale {
	maximum: number;
	logarithmic: boolean;
}

export const getFitnessColorPosition = (
	value: number,
	scale: FitnessColorScale,
): number => {
	if (scale.maximum <= 0) return 0;
	const clamped = Math.max(0, Math.min(value, scale.maximum));
	return scale.logarithmic
		? Math.log1p(clamped) / Math.log1p(scale.maximum)
		: clamped / scale.maximum;
};

export const getFitnessValueAtPosition = (
	position: number,
	scale: FitnessColorScale,
): number => {
	const clamped = Math.max(0, Math.min(position, 1));
	if (clamped === 0) return 0;
	if (clamped === 1) return scale.maximum;
	return scale.logarithmic
		? Math.expm1(clamped * Math.log1p(scale.maximum))
		: clamped * scale.maximum;
};

export const getFitnessColor = (position: number): RGB =>
	PALETTE[Math.round(Math.max(0, Math.min(position, 1)) * 255)];
