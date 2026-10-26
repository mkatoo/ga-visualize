import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { OBJECTIVE_FUNCTIONS } from "./objective-functions";
import { Visualizer } from "./visualizer";

describe("Visualizer coordinates", () => {
	const context = {
		clearRect: vi.fn(),
		fillRect: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		fillText: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn(),
	};

	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			context as unknown as CanvasRenderingContext2D,
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	const renderRosenbrock = () => {
		const objective = OBJECTIVE_FUNCTIONS.rosenbrock;
		const population = [-2, -1, 0, 1, 2].map((value) => ({
			x: value,
			y: value,
			fitness: objective.fn(value, value),
		}));

		render(() => (
			<Visualizer
				population={population}
				bounds={objective.bounds}
				generation={0}
				averageFitness={0}
				bestIndividual={population[3]}
				functionType="rosenbrock"
			/>
		));
	};

	test("draws positive Y above the origin and negative Y below it", () => {
		renderRosenbrock();

		for (const [x, y, radius] of [
			[0, 500, 2],
			[125, 375, 2],
			[250, 250, 2],
			[375, 125, 4],
			[500, 0, 2],
		]) {
			expect(context.arc).toHaveBeenCalledWith(x, y, radius, 0, 2 * Math.PI);
		}
		expect(context.fillText).toHaveBeenCalledWith("1", 265, 125);
		expect(context.fillText).toHaveBeenCalledWith("-1", 265, 375);
	});

	test("draws contours in the same Y direction as individuals and labels", () => {
		renderRosenbrock();

		// Rosenbrock(-1, 1) = 4, so its contour passes through canvas (125, 125).
		const contourPoints = [
			...context.moveTo.mock.calls,
			...context.lineTo.mock.calls,
		];
		expect(contourPoints.some(([x, y]) => x === 125 && y === 125)).toBe(true);
		expect(contourPoints.some(([x, y]) => x === 125 && y === 375)).toBe(false);
	});
});
