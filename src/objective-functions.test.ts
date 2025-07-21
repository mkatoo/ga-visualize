import { describe, expect, test } from "vitest";
import {
	type FunctionType,
	getObjectiveFunction,
	OBJECTIVE_FUNCTIONS,
} from "./objective-functions";

describe("Objective Functions", () => {
	describe("Sphere Function", () => {
		const sphereFunction = OBJECTIVE_FUNCTIONS.sphere.fn;

		test("should calculate known values correctly", () => {
			expect(sphereFunction(0, 0)).toBe(0);
			expect(sphereFunction(1, 1)).toBe(2);
			expect(sphereFunction(3, 4)).toBe(25);
			expect(sphereFunction(-2, -3)).toBe(13);
			expect(sphereFunction(0.5, 0.5)).toBe(0.5);
		});

		test("should have minimum value at origin", () => {
			const origin = sphereFunction(0, 0);
			expect(origin).toBe(0);

			// Test that nearby points have higher values
			expect(sphereFunction(0.1, 0)).toBeGreaterThan(origin);
			expect(sphereFunction(0, 0.1)).toBeGreaterThan(origin);
			expect(sphereFunction(0.1, 0.1)).toBeGreaterThan(origin);
		});

		test("should be symmetric", () => {
			expect(sphereFunction(2, 3)).toBe(sphereFunction(-2, 3));
			expect(sphereFunction(2, 3)).toBe(sphereFunction(2, -3));
			expect(sphereFunction(2, 3)).toBe(sphereFunction(-2, -3));
		});
	});

	describe("Rosenbrock Function", () => {
		const rosenbrockFunction = OBJECTIVE_FUNCTIONS.rosenbrock.fn;

		test("should calculate known values correctly", () => {
			expect(rosenbrockFunction(1, 1)).toBe(0);
			expect(rosenbrockFunction(0, 0)).toBe(1);
			expect(rosenbrockFunction(-1, 1)).toBe(4);
			expect(rosenbrockFunction(2, 4)).toBe(1);
		});

		test("should have global minimum at (1,1)", () => {
			const globalMin = rosenbrockFunction(1, 1);
			expect(globalMin).toBe(0);

			// Test that nearby points have higher values
			expect(rosenbrockFunction(1.1, 1.1)).toBeGreaterThan(globalMin);
			expect(rosenbrockFunction(0.9, 0.9)).toBeGreaterThan(globalMin);
			expect(rosenbrockFunction(1, 1.1)).toBeGreaterThan(globalMin);
			expect(rosenbrockFunction(1.1, 1)).toBeGreaterThan(globalMin);
		});

		test("should implement standard Rosenbrock formula", () => {
			// f(x,y) = (a-x)² + b(y-x²)² where a=1, b=100
			const x = 0.5;
			const y = 0.3;
			const a = 1;
			const b = 100;
			const expected = (a - x) ** 2 + b * (y - x ** 2) ** 2;

			expect(rosenbrockFunction(x, y)).toBe(expected);
		});
	});

	describe("OBJECTIVE_FUNCTIONS constant", () => {
		test("should contain all expected function types", () => {
			expect(OBJECTIVE_FUNCTIONS).toHaveProperty("sphere");
			expect(OBJECTIVE_FUNCTIONS).toHaveProperty("rosenbrock");
			expect(Object.keys(OBJECTIVE_FUNCTIONS)).toHaveLength(2);
		});

		test("should have correct structure for each function", () => {
			const functionTypes: FunctionType[] = ["sphere", "rosenbrock"];

			functionTypes.forEach((type) => {
				const func = OBJECTIVE_FUNCTIONS[type];
				expect(func).toHaveProperty("name");
				expect(func).toHaveProperty("fn");
				expect(func).toHaveProperty("bounds");
				expect(func).toHaveProperty("contourLevels");

				expect(typeof func.name).toBe("string");
				expect(typeof func.fn).toBe("function");
				expect(typeof func.bounds).toBe("object");
				expect(Array.isArray(func.contourLevels)).toBe(true);
			});
		});

		test("should have valid bounds", () => {
			const sphere = OBJECTIVE_FUNCTIONS.sphere;
			expect(sphere.bounds.min).toBeLessThan(sphere.bounds.max);
			expect(typeof sphere.bounds.min).toBe("number");
			expect(typeof sphere.bounds.max).toBe("number");

			const rosenbrock = OBJECTIVE_FUNCTIONS.rosenbrock;
			expect(rosenbrock.bounds.min).toBeLessThan(rosenbrock.bounds.max);
			expect(typeof rosenbrock.bounds.min).toBe("number");
			expect(typeof rosenbrock.bounds.max).toBe("number");
		});

		test("should have non-empty contour levels", () => {
			expect(OBJECTIVE_FUNCTIONS.sphere.contourLevels.length).toBeGreaterThan(
				0,
			);
			expect(
				OBJECTIVE_FUNCTIONS.rosenbrock.contourLevels.length,
			).toBeGreaterThan(0);

			// Contour levels should be positive numbers
			OBJECTIVE_FUNCTIONS.sphere.contourLevels.forEach((level) => {
				expect(level).toBeGreaterThan(0);
			});
			OBJECTIVE_FUNCTIONS.rosenbrock.contourLevels.forEach((level) => {
				expect(level).toBeGreaterThan(0);
			});
		});

		test("should have appropriate function names", () => {
			expect(OBJECTIVE_FUNCTIONS.sphere.name).toBe("Sphere Function");
			expect(OBJECTIVE_FUNCTIONS.rosenbrock.name).toBe("Rosenbrock Function");
		});
	});

	describe("getObjectiveFunction", () => {
		test("should return correct function object for sphere", () => {
			const sphereObj = getObjectiveFunction("sphere");
			expect(sphereObj).toBe(OBJECTIVE_FUNCTIONS.sphere);
			expect(sphereObj.name).toBe("Sphere Function");
		});

		test("should return correct function object for rosenbrock", () => {
			const rosenbrockObj = getObjectiveFunction("rosenbrock");
			expect(rosenbrockObj).toBe(OBJECTIVE_FUNCTIONS.rosenbrock);
			expect(rosenbrockObj.name).toBe("Rosenbrock Function");
		});

		test("should return functional calculation function", () => {
			const sphereObj = getObjectiveFunction("sphere");
			expect(sphereObj.fn(3, 4)).toBe(25);

			const rosenbrockObj = getObjectiveFunction("rosenbrock");
			expect(rosenbrockObj.fn(1, 1)).toBe(0);
		});

		test("should return different objects for different function types", () => {
			const sphereObj = getObjectiveFunction("sphere");
			const rosenbrockObj = getObjectiveFunction("rosenbrock");

			expect(sphereObj).not.toBe(rosenbrockObj);
			expect(sphereObj.bounds).not.toEqual(rosenbrockObj.bounds);
			expect(sphereObj.contourLevels).not.toEqual(rosenbrockObj.contourLevels);
		});
	});
});
