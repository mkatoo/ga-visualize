import { describe, expect, test } from "vitest";
import { createFitnessChartModel } from "./fitness-chart-model";

const options = {
	bestFitness: [100, 1, 0.01, 0],
	averageFitness: [200, 2, 0.02, 0],
	totalGenerations: 3,
	width: 640,
	height: 260,
	scale: "linear",
} as const;

describe("fitness chart model", () => {
	test("places linear fitness proportionally and spans the configured generations", () => {
		const model = createFitnessChartModel(options);
		expect(model.x(0)).toBe(72);
		expect(model.x(3)).toBe(620);
		expect(model.y(0)).toBe(212);
		expect(model.y(100)).toBe(117);
		expect(model.y(200)).toBe(22);
		expect(model.generationTicks).toEqual([0, 1, 2, 3]);
		expect(model.fitnessTicks).toEqual([0, 50, 100, 150, 200]);
	});

	test("separates equal orders of magnitude equally and puts zero below positive values", () => {
		const model = createFitnessChartModel({ ...options, scale: "logarithmic" });
		expect(model.y(1) - model.y(100)).toBeCloseTo(model.y(0.01) - model.y(1));
		expect(model.y(0)).toBe(model.plotBottom);
		expect(model.y(0.01)).toBeLessThan(model.y(0));
		expect(model.fitnessTicks[0]).toBe(0);
		expect(model.fitnessTicks.at(-1)).toBeCloseTo(200);
	});

	test.each([0, Number.MIN_VALUE, 1e-200])(
		"keeps logarithmic coordinates and ticks finite near zero (%s)",
		(value) => {
			const model = createFitnessChartModel({
				...options,
				bestFitness: [value, 0],
				averageFitness: [value, 0],
				scale: "logarithmic",
			});
			expect(Number.isFinite(model.y(value))).toBe(true);
			expect(model.y(0)).toBe(model.plotBottom);
			expect(model.fitnessTicks.every(Number.isFinite)).toBe(true);
		},
	);

	test("maps points inside the plot to generations and rejects axis and margin clicks", () => {
		const model = createFitnessChartModel(options);
		expect(model.generationAtPoint(72, 22)).toBe(0);
		expect(model.generationAtPoint(346, 100)).toBe(1.5);
		expect(model.generationAtPoint(620, 212)).toBe(3);
		for (const [x, y] of [
			[71, 100],
			[621, 100],
			[346, 21],
			[346, 213],
		]) {
			expect(model.generationAtPoint(x, y)).toBeUndefined();
		}
	});

	test("adapts tick density and coordinates to the viewport while retaining the fitness scale", () => {
		const narrow = createFitnessChartModel({ ...options, width: 240 });
		const wide = createFitnessChartModel({
			...options,
			width: 960,
			height: 400,
		});
		expect(narrow.generationTicks).toEqual([0, 3]);
		expect(wide.generationTicks).toEqual([0, 1, 2, 3]);
		expect(narrow.x(3)).toBe(220);
		expect(wide.x(3)).toBe(940);
		expect(wide.y(0)).toBe(352);
		expect(wide.y(200)).toBe(22);
		expect(narrow.fitnessTicks).toEqual(wide.fitnessTicks);
	});
});
