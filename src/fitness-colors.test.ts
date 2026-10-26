import { describe, expect, test } from "vitest";
import {
	getFitnessColor,
	getFitnessColorPosition,
	getFitnessValueAtPosition,
} from "./fitness-colors";

describe("Fitness colors", () => {
	test("maps linear values to their fraction of the plot maximum", () => {
		const scale = { maximum: 200, logarithmic: false };
		expect(getFitnessColorPosition(50, scale)).toBe(0.25);
		expect(getFitnessValueAtPosition(0.75, scale)).toBe(150);
	});

	test("keeps zero finite and reveals small values with a logarithmic scale", () => {
		const scale = { maximum: 99, logarithmic: true };
		expect(getFitnessColorPosition(0, scale)).toBe(0);
		expect(getFitnessColorPosition(9, scale)).toBeCloseTo(0.5);
		expect(getFitnessValueAtPosition(0.5, scale)).toBeCloseTo(9);
	});

	test.each([false, true])(
		"keeps legend values aligned with their colors (logarithmic: %s)",
		(logarithmic) => {
			const scale = { maximum: 181853.61328125, logarithmic };
			for (const position of [0, 0.25, 0.5, 0.75, 1]) {
				const value = getFitnessValueAtPosition(position, scale);
				expect(getFitnessColorPosition(value, scale)).toBeCloseTo(position);
			}
			expect(getFitnessValueAtPosition(1, scale)).toBe(scale.maximum);
		},
	);

	test.each([false, true])(
		"handles a zero range and clamps values outside the scale (logarithmic: %s)",
		(logarithmic) => {
			const scale = { maximum: 200, logarithmic };
			expect(getFitnessColorPosition(-1e-12, scale)).toBe(0);
			expect(getFitnessColorPosition(1000, scale)).toBe(1);
			expect(getFitnessColorPosition(0, { ...scale, maximum: 0 })).toBe(0);
			expect(getFitnessValueAtPosition(0.5, { ...scale, maximum: 0 })).toBe(0);
		},
	);

	test("progresses from purple to green to yellow as fitness increases", () => {
		const low = getFitnessColor(0);
		const middle = getFitnessColor(0.5);
		const high = getFitnessColor(1);
		expect(low[2]).toBeGreaterThan(low[1]);
		expect(middle[1]).toBeGreaterThan(middle[0]);
		expect(high[0]).toBeGreaterThan(high[2]);
		expect(high[1]).toBeGreaterThan(middle[1]);
		expect(middle[1]).toBeGreaterThan(low[1]);
		expect(getFitnessColor(-1)).toEqual(low);
		expect(getFitnessColor(2)).toEqual(high);
	});
});
