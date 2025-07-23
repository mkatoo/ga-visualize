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

	describe("Ackley Function", () => {
		const ackleyFunction = OBJECTIVE_FUNCTIONS.ackley.fn;

		test("should calculate known values correctly", () => {
			// Global minimum at origin should be 0
			expect(ackleyFunction(0, 0)).toBeCloseTo(0, 10);

			// Test some other known approximate values
			expect(ackleyFunction(1, 0)).toBeGreaterThan(2);
			expect(ackleyFunction(0, 1)).toBeGreaterThan(2);
			expect(ackleyFunction(1, 1)).toBeGreaterThan(3);
			expect(ackleyFunction(-1, -1)).toBeGreaterThan(3);
		});

		test("should have global minimum at origin", () => {
			const globalMin = ackleyFunction(0, 0);
			expect(globalMin).toBeCloseTo(0, 10);

			// Test that nearby points have higher values
			expect(ackleyFunction(0.1, 0)).toBeGreaterThan(globalMin);
			expect(ackleyFunction(0, 0.1)).toBeGreaterThan(globalMin);
			expect(ackleyFunction(0.1, 0.1)).toBeGreaterThan(globalMin);
			expect(ackleyFunction(-0.1, -0.1)).toBeGreaterThan(globalMin);
		});

		test("should implement standard Ackley formula", () => {
			// f(x,y) = -a*exp(-b*sqrt((x²+y²)/2)) - exp((cos(c*x)+cos(c*y))/2) + a + e
			// where a=20, b=0.2, c=2π
			const x = 1;
			const y = 0.5;
			const a = 20;
			const b = 0.2;
			const c = 2 * Math.PI;
			const expected =
				-a * Math.exp(-b * Math.sqrt((x * x + y * y) / 2)) -
				Math.exp((Math.cos(c * x) + Math.cos(c * y)) / 2) +
				a +
				Math.E;

			expect(ackleyFunction(x, y)).toBeCloseTo(expected, 10);
		});

		test("should be symmetric", () => {
			// Ackley function should be symmetric around origin
			expect(ackleyFunction(2, 1)).toBeCloseTo(ackleyFunction(-2, 1), 10);
			expect(ackleyFunction(1, 2)).toBeCloseTo(ackleyFunction(1, -2), 10);
			expect(ackleyFunction(2, 1)).toBeCloseTo(ackleyFunction(1, 2), 10);
		});
	});

	describe("Rastrigin Function", () => {
		const rastriginFunction = OBJECTIVE_FUNCTIONS.rastrigin.fn;

		test("should calculate known values correctly", () => {
			// Global minimum at origin should be 0
			expect(rastriginFunction(0, 0)).toBe(0);

			// Test some other known values
			expect(rastriginFunction(1, 0)).toBeCloseTo(1, 10);
			expect(rastriginFunction(0, 1)).toBeCloseTo(1, 10);
			expect(rastriginFunction(1, 1)).toBeCloseTo(2, 10);
			expect(rastriginFunction(-1, -1)).toBeCloseTo(2, 10);
		});

		test("should have global minimum at origin", () => {
			const globalMin = rastriginFunction(0, 0);
			expect(globalMin).toBe(0);

			// Test that nearby points have higher values
			expect(rastriginFunction(0.1, 0)).toBeGreaterThan(globalMin);
			expect(rastriginFunction(0, 0.1)).toBeGreaterThan(globalMin);
			expect(rastriginFunction(0.1, 0.1)).toBeGreaterThan(globalMin);
			expect(rastriginFunction(-0.1, -0.1)).toBeGreaterThan(globalMin);
		});

		test("should implement standard Rastrigin formula", () => {
			// f(x,y) = A*n + (x² - A*cos(2π*x)) + (y² - A*cos(2π*y))
			// where A=10, n=2
			const x = 1.5;
			const y = 0.7;
			const A = 10;
			const n = 2;
			const expected =
				A * n +
				(x * x - A * Math.cos(2 * Math.PI * x)) +
				(y * y - A * Math.cos(2 * Math.PI * y));

			expect(rastriginFunction(x, y)).toBeCloseTo(expected, 10);
		});

		test("should be symmetric", () => {
			// Rastrigin function should be symmetric around origin
			expect(rastriginFunction(2, 1)).toBeCloseTo(rastriginFunction(-2, 1), 10);
			expect(rastriginFunction(1, 2)).toBeCloseTo(rastriginFunction(1, -2), 10);
			expect(rastriginFunction(2, 1)).toBeCloseTo(rastriginFunction(1, 2), 10);
		});

		test("should have multiple local minima", () => {
			// Rastrigin function is known for having many local minima
			// Test that it has local minima at integer coordinates other than origin
			const localMin1 = rastriginFunction(1, 0);
			const localMin2 = rastriginFunction(0, 1);
			const localMin3 = rastriginFunction(1, 1);

			// These should be local minima (lower than nearby non-integer points)
			expect(localMin1).toBeLessThan(rastriginFunction(1.2, 0));
			expect(localMin2).toBeLessThan(rastriginFunction(0, 1.2));
			expect(localMin3).toBeLessThan(rastriginFunction(1.2, 1.2));
		});
	});

	describe("OBJECTIVE_FUNCTIONS constant", () => {
		test("should contain all expected function types", () => {
			expect(OBJECTIVE_FUNCTIONS).toHaveProperty("sphere");
			expect(OBJECTIVE_FUNCTIONS).toHaveProperty("rosenbrock");
			expect(OBJECTIVE_FUNCTIONS).toHaveProperty("ackley");
			expect(OBJECTIVE_FUNCTIONS).toHaveProperty("rastrigin");
			expect(Object.keys(OBJECTIVE_FUNCTIONS)).toHaveLength(4);
		});

		test("should have correct structure for each function", () => {
			const functionTypes: FunctionType[] = [
				"sphere",
				"rosenbrock",
				"ackley",
				"rastrigin",
			];

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

			const ackley = OBJECTIVE_FUNCTIONS.ackley;
			expect(ackley.bounds.min).toBeLessThan(ackley.bounds.max);
			expect(typeof ackley.bounds.min).toBe("number");
			expect(typeof ackley.bounds.max).toBe("number");

			const rastrigin = OBJECTIVE_FUNCTIONS.rastrigin;
			expect(rastrigin.bounds.min).toBeLessThan(rastrigin.bounds.max);
			expect(typeof rastrigin.bounds.min).toBe("number");
			expect(typeof rastrigin.bounds.max).toBe("number");
		});

		test("should have non-empty contour levels", () => {
			expect(OBJECTIVE_FUNCTIONS.sphere.contourLevels.length).toBeGreaterThan(
				0,
			);
			expect(
				OBJECTIVE_FUNCTIONS.rosenbrock.contourLevels.length,
			).toBeGreaterThan(0);
			expect(OBJECTIVE_FUNCTIONS.ackley.contourLevels.length).toBeGreaterThan(
				0,
			);
			expect(
				OBJECTIVE_FUNCTIONS.rastrigin.contourLevels.length,
			).toBeGreaterThan(0);

			// Contour levels should be positive numbers
			OBJECTIVE_FUNCTIONS.sphere.contourLevels.forEach((level) => {
				expect(level).toBeGreaterThan(0);
			});
			OBJECTIVE_FUNCTIONS.rosenbrock.contourLevels.forEach((level) => {
				expect(level).toBeGreaterThan(0);
			});
			OBJECTIVE_FUNCTIONS.ackley.contourLevels.forEach((level) => {
				expect(level).toBeGreaterThan(0);
			});
			OBJECTIVE_FUNCTIONS.rastrigin.contourLevels.forEach((level) => {
				expect(level).toBeGreaterThan(0);
			});
		});

		test("should have appropriate function names", () => {
			expect(OBJECTIVE_FUNCTIONS.sphere.name).toBe("Sphere Function");
			expect(OBJECTIVE_FUNCTIONS.rosenbrock.name).toBe("Rosenbrock Function");
			expect(OBJECTIVE_FUNCTIONS.ackley.name).toBe("Ackley Function");
			expect(OBJECTIVE_FUNCTIONS.rastrigin.name).toBe("Rastrigin Function");
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

		test("should return correct function object for ackley", () => {
			const ackleyObj = getObjectiveFunction("ackley");
			expect(ackleyObj).toBe(OBJECTIVE_FUNCTIONS.ackley);
			expect(ackleyObj.name).toBe("Ackley Function");
		});

		test("should return correct function object for rastrigin", () => {
			const rastriginObj = getObjectiveFunction("rastrigin");
			expect(rastriginObj).toBe(OBJECTIVE_FUNCTIONS.rastrigin);
			expect(rastriginObj.name).toBe("Rastrigin Function");
		});

		test("should return functional calculation function", () => {
			const sphereObj = getObjectiveFunction("sphere");
			expect(sphereObj.fn(3, 4)).toBe(25);

			const rosenbrockObj = getObjectiveFunction("rosenbrock");
			expect(rosenbrockObj.fn(1, 1)).toBe(0);

			const ackleyObj = getObjectiveFunction("ackley");
			expect(ackleyObj.fn(0, 0)).toBeCloseTo(0, 10);

			const rastriginObj = getObjectiveFunction("rastrigin");
			expect(rastriginObj.fn(0, 0)).toBe(0);
		});

		test("should return different objects for different function types", () => {
			const sphereObj = getObjectiveFunction("sphere");
			const rosenbrockObj = getObjectiveFunction("rosenbrock");
			const ackleyObj = getObjectiveFunction("ackley");
			const rastriginObj = getObjectiveFunction("rastrigin");

			expect(sphereObj).not.toBe(rosenbrockObj);
			expect(sphereObj).not.toBe(ackleyObj);
			expect(sphereObj).not.toBe(rastriginObj);
			expect(rosenbrockObj).not.toBe(ackleyObj);
			expect(rosenbrockObj).not.toBe(rastriginObj);
			expect(ackleyObj).not.toBe(rastriginObj);
			expect(sphereObj.bounds).not.toEqual(rosenbrockObj.bounds);
			expect(sphereObj.bounds).not.toEqual(ackleyObj.bounds);
			expect(sphereObj.bounds).not.toEqual(rastriginObj.bounds);
			expect(sphereObj.contourLevels).not.toEqual(rosenbrockObj.contourLevels);
			expect(sphereObj.contourLevels).not.toEqual(ackleyObj.contourLevels);
			expect(sphereObj.contourLevels).not.toEqual(rastriginObj.contourLevels);
		});
	});
});
