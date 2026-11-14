import { FITNESS_CHART_INSETS } from "./constants";

export type FitnessChartScale = "linear" | "logarithmic";

interface FitnessChartModelOptions {
	bestFitness: readonly number[];
	averageFitness: readonly number[];
	totalGenerations: number;
	width: number;
	height: number;
	scale: FitnessChartScale;
}

const fitnessNumberFormat = new Intl.NumberFormat("ja-JP", {
	maximumSignificantDigits: 3,
});

export function formatFitnessTick(value: number) {
	if (value === 0) return "0";
	return Math.abs(value) < 0.01 || Math.abs(value) >= 10_000
		? value.toExponential(1)
		: fitnessNumberFormat.format(value);
}

export function createFitnessChartModel(options: FitnessChartModelOptions) {
	const plotLeft = 72;
	const plotRight = options.width - 20;
	const plotTop = FITNESS_CHART_INSETS.top;
	const plotBottom = options.height - FITNESS_CHART_INSETS.bottom;
	const plotWidth = Math.max(1, plotRight - plotLeft);
	const plotHeight = plotBottom - plotTop;
	const maxGeneration = Math.max(1, options.totalGenerations);
	const maxFitness =
		Math.max(0, ...options.bestFitness, ...options.averageFitness) || 1;
	const positive = [...options.bestFitness, ...options.averageFitness].filter(
		(value) => value > 0,
	);
	const logBounds = {
		min: Math.log10(Math.min(...positive, maxFitness)) - 1,
		max: Math.log10(maxFitness),
	};
	const x = (generation: number) =>
		plotLeft + (generation / maxGeneration) * plotWidth;
	const y = (fitness: number) => {
		const position =
			options.scale === "linear"
				? Math.max(0, fitness) / maxFitness
				: fitness > 0
					? (Math.log10(fitness) - logBounds.min) /
						(logBounds.max - logBounds.min)
					: 0;
		return plotBottom - position * plotHeight;
	};
	const intervals = Math.min(
		maxGeneration,
		Math.max(1, Math.floor(plotWidth / 80)),
	);
	const generationTicks = Array.from({ length: intervals + 1 }, (_, i) =>
		Math.round((i / intervals) * maxGeneration),
	);
	const fitnessTicks = [0, 0.25, 0.5, 0.75, 1].map((position) =>
		options.scale === "linear"
			? position * maxFitness
			: position === 0
				? 0
				: 10 ** (logBounds.min + position * (logBounds.max - logBounds.min)),
	);
	const generationAtPoint = (pointerX: number, pointerY: number) => {
		if (
			pointerX < plotLeft ||
			pointerX > plotRight ||
			pointerY < plotTop ||
			pointerY > plotBottom
		)
			return;
		return ((pointerX - plotLeft) / plotWidth) * maxGeneration;
	};
	return {
		plotLeft,
		plotTop,
		plotBottom,
		plotWidth,
		maxGeneration,
		x,
		y,
		generationTicks,
		fitnessTicks,
		generationAtPoint,
	};
}
