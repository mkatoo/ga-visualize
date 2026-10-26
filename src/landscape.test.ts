import { describe, expect, test, vi } from "vitest";
import { getFitnessColorPosition } from "./fitness-colors";
import {
	createFunctionGrid,
	createLandscape,
	createSurfaceGrid,
	getDefaultHeightScale,
	getFitnessHeight,
	getHeightTickValue,
	getIndividualPosition,
	type HeightScale,
} from "./landscape";
import { type FunctionType, OBJECTIVE_FUNCTIONS } from "./objective-functions";

describe("landscape coordinates and fixed scales", () => {
	test.each(Object.keys(OBJECTIVE_FUNCTIONS) as FunctionType[])(
		"%s has a finite fixed scale at both surface resolutions",
		(type) => {
			const landscape = createLandscape(type, OBJECTIVE_FUNCTIONS[type].bounds);
			expect(landscape.grid).toHaveLength(500);
			expect(landscape.grid[0]).toHaveLength(500);
			expect(landscape.issue).toBeNull();
			expect(landscape.colorScale.maximum).toBeGreaterThan(0);
			const scale = { ...landscape.colorScale };
			for (const resolution of [64, 100]) {
				const surface = createSurfaceGrid(landscape, resolution);
				expect(surface.fitness).toHaveLength((resolution + 1) ** 2);
				expect(surface.indices).toHaveLength(resolution ** 2 * 6);
				expect(surface.gridIndices).toHaveLength(
					4 * resolution * (resolution + 1),
				);
				expect([...surface.fitness].every(Number.isFinite)).toBe(true);
			}
			expect(landscape.colorScale).toEqual(scale);
			expect(getDefaultHeightScale(landscape)).toBe(
				type === "rosenbrock" || type === "beale" ? "logarithmic" : "linear",
			);
		},
	);

	test.each([
		["sphere", 0, 0],
		["rosenbrock", 1, 1],
		["beale", 3, 0.5],
	] as const)("%s places the known minimum at height zero", (type, x, y) => {
		const objective = OBJECTIVE_FUNCTIONS[type];
		const landscape = createLandscape(type, objective.bounds);
		const fitness = objective.fn(x, y);
		expect(fitness).toBe(0);
		for (const scale of ["linear", "logarithmic"] as const) {
			const position = getIndividualPosition(
				{ x, y, fitness },
				landscape,
				scale,
			);
			expect(position[0]).toBeCloseTo(
				(2 * (x - objective.bounds.min)) /
					(objective.bounds.max - objective.bounds.min) -
					1,
			);
			expect(position[1]).toBeCloseTo(
				(2 * (y - objective.bounds.min)) /
					(objective.bounds.max - objective.bounds.min) -
					1,
			);
			expect(position[2]).toBe(0);
		}
	});

	test("keeps X and Y in order, without reversing either axis", () => {
		const landscape = createLandscape("rosenbrock", { min: -2, max: 2 });
		const surface = createSurfaceGrid(landscape, 4);
		// index = xIndex * (resolution + 1) + yIndex
		expect(surface.fitness[1 * 5 + 3]).toBe(4); // f(-1, 1)
		expect(surface.fitness[3 * 5 + 1]).toBe(400); // f(1, -1)
		expect(
			getIndividualPosition({ x: -1, y: 1, fitness: 4 }, landscape, "linear"),
		).toEqual([-0.5, 0.5, 4 / 3609]);
		expect(
			createFunctionGrid((x, y) => 10 * x + y, { min: 0, max: 2 }, 2),
		).toEqual([
			[0, 1, 2],
			[10, 11, 12],
			[20, 21, 22],
		]);
	});

	test("detects non-finite values in the fixed grid and refuses a surface", () => {
		const spy = vi
			.spyOn(OBJECTIVE_FUNCTIONS.sphere, "fn")
			.mockReturnValue(Number.NaN);
		try {
			const landscape = createLandscape("sphere", { min: -1, max: 1 });
			expect(landscape.issue).toContain("有限でない値");
			expect(() => createSurfaceGrid(landscape)).toThrow("有限でない値");
		} finally {
			spy.mockRestore();
		}
	});

	test("also detects a non-finite value sampled only by the surface grid", () => {
		const landscape = createLandscape("sphere", { min: -1, max: 1 });
		const spy = vi
			.spyOn(OBJECTIVE_FUNCTIONS.sphere, "fn")
			.mockImplementation((x, y) =>
				x === 0 && y === 0 ? Number.POSITIVE_INFINITY : x * x + y * y,
			);
		try {
			expect(() => createSurfaceGrid(landscape, 100)).toThrow("有限でない値");
		} finally {
			spy.mockRestore();
		}
	});

	test("rejects empty bounds and invalid grid resolutions", () => {
		expect(() =>
			createFunctionGrid(() => 0, { min: 1, max: 1 }, 100),
		).toThrow();
		expect(() => createFunctionGrid(() => 0, { min: -1, max: 1 }, 0)).toThrow();
	});
});

describe.each<HeightScale>(["linear", "logarithmic"])("%s heights", (scale) => {
	test("are finite and monotone, including values above the fixed maximum", () => {
		const values = [0, 1, 20, 100, 150];
		const heights = values.map((value) => getFitnessHeight(value, 100, scale));
		expect(heights.every(Number.isFinite)).toBe(true);
		expect(heights).toEqual([...heights].sort((a, b) => a - b));
		expect(heights[0]).toBe(0);
		expect(heights[3]).toBe(1);
		expect(heights[4]).toBeGreaterThan(1);
		expect(
			getFitnessColorPosition(150, {
				maximum: 100,
				logarithmic: scale === "logarithmic",
			}),
		).toBe(1);
		expect(getFitnessHeight(-Number.EPSILON, 100, scale)).toBe(0);
		expect(getFitnessHeight(0, 0, scale)).toBe(0);
	});
	test("labels heights with the original fitness values", () => {
		for (const value of [0, 0.01, 1, 25, 100, 150]) {
			expect(
				getHeightTickValue(getFitnessHeight(value, 100, scale), 100, scale),
			).toBeCloseTo(value, 8);
		}
	});
});
