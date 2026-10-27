import { cleanup, render } from "@solidjs/testing-library";
import { batch, createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GAVisualization as Visualizer } from "./components/ga-visualization";
import type { Individual } from "./genetic-algorithm";
import { type FunctionType, OBJECTIVE_FUNCTIONS } from "./objective-functions";

const createContext = () => ({
	clearRect: vi.fn(),
	fillRect: vi.fn(),
	beginPath: vi.fn(),
	moveTo: vi.fn(),
	lineTo: vi.fn(),
	stroke: vi.fn(),
	strokeText: vi.fn(),
	fillText: vi.fn(),
	arc: vi.fn(),
	fill: vi.fn(),
	drawImage: vi.fn(),
	createImageData: vi.fn((width: number, height: number) => ({
		width,
		height,
		data: new Uint8ClampedArray(width * height * 4),
	})),
	putImageData: vi.fn(),
	fillStyle: "",
	strokeStyle: "",
	lineWidth: 1,
});

describe("Visualizer", () => {
	const context = createContext();
	const backgroundContext = createContext();

	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
			function (this: HTMLCanvasElement) {
				return (this.hasAttribute("aria-label")
					? context
					: backgroundContext) as unknown as CanvasRenderingContext2D;
			},
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
		expect(backgroundContext.fillText).toHaveBeenCalledWith("1", 265, 125);
		expect(backgroundContext.fillText).toHaveBeenCalledWith("-1", 265, 375);
	});

	test("draws contours in the same Y direction as individuals and labels", () => {
		renderRosenbrock();

		// Rosenbrock(-1, 1) = 4, so its contour passes through canvas (125, 125).
		const contourPoints = [
			...backgroundContext.moveTo.mock.calls,
			...backgroundContext.lineTo.mock.calls,
		];
		expect(contourPoints.some(([x, y]) => x === 125 && y === 125)).toBe(true);
		expect(contourPoints.some(([x, y]) => x === 125 && y === 375)).toBe(false);
	});

	test("draws the heatmap in the same Y direction as contours and individuals", () => {
		renderRosenbrock();
		const image = backgroundContext.putImageData.mock.calls[0][0];
		// The valley at (1, 1) is above the origin; (1, -1) has higher fitness.
		const upperGreen = image.data[(125 * 500 + 375) * 4 + 1];
		const lowerGreen = image.data[(375 * 500 + 375) * 4 + 1];
		expect(upperGreen).toBeLessThan(lowerGreen);
	});

	test("colors the entire domain, including values beyond the last contour", () => {
		const { getByRole, getByText } = render(() => (
			<Visualizer
				population={[]}
				bounds={OBJECTIVE_FUNCTIONS.sphere.bounds}
				generation={0}
				averageFitness={0}
				bestIndividual={null}
				functionType="sphere"
			/>
		));
		const image = backgroundContext.putImageData.mock.calls[0][0];
		const centerOffset = (250 * 500 + 250) * 4;
		expect(image.data[1]).toBeGreaterThan(image.data[centerOffset + 1]);
		for (let offset = 3; offset < image.data.length; offset += 4) {
			if (image.data[offset] !== 255) throw new Error("Unpainted pixel");
		}
		expect(getByRole("figure", { name: "背景色と評価値の対応" })).toBeTruthy();
		expect(getByText("200")).toBeTruthy();
		expect(getByText("低い・良い")).toBeTruthy();
		expect(getByText("高い・悪い")).toBeTruthy();
	});

	test("reuses the background and scale as the population evolves or is cleared", () => {
		const [population, setPopulation] = createSignal<Individual[]>([]);
		const [bounds, setBounds] = createSignal({ min: -10, max: 10 });
		const { getByText } = render(() => (
			<Visualizer
				population={population()}
				bounds={bounds()}
				generation={population().length}
				averageFitness={0}
				bestIndividual={null}
				functionType="sphere"
			/>
		));
		const background = context.drawImage.mock.calls[0][0];
		setPopulation([{ x: 1, y: 1, fitness: 2 }]);
		setBounds({ min: -10, max: 10 });
		expect(backgroundContext.putImageData).toHaveBeenCalledTimes(1);
		expect(context.drawImage).toHaveBeenLastCalledWith(background, 0, 0);
		expect(getByText("200")).toBeTruthy();

		context.arc.mockClear();
		context.drawImage.mockClear();
		setPopulation([]);
		expect(context.drawImage).toHaveBeenCalledWith(background, 0, 0);
		expect(context.arc).not.toHaveBeenCalled();
		expect(backgroundContext.putImageData).toHaveBeenCalledTimes(1);
	});

	test("updates the background and legend when bounds or function change with no individuals", () => {
		const [bounds, setBounds] = createSignal({ min: -10, max: 10 });
		const [functionType, setFunctionType] =
			createSignal<FunctionType>("sphere");
		const { getByText, queryByText } = render(() => (
			<Visualizer
				population={[]}
				bounds={bounds()}
				generation={0}
				averageFitness={0}
				bestIndividual={null}
				functionType={functionType()}
			/>
		));
		expect(getByText("200")).toBeTruthy();
		expect(getByText("線形目盛")).toBeTruthy();

		setBounds({ min: -1, max: 1 });
		expect(getByText("2")).toBeTruthy();
		expect(queryByText("200")).toBeNull();
		expect(backgroundContext.putImageData).toHaveBeenCalledTimes(2);

		batch(() => {
			setFunctionType("rosenbrock");
			setBounds({ min: -2, max: 2 });
		});
		expect(getByText("3,609")).toBeTruthy();
		expect(getByText("対数目盛")).toBeTruthy();
		expect(queryByText("線形目盛")).toBeNull();
		expect(backgroundContext.putImageData).toHaveBeenCalledTimes(3);
	});

	test("outlines individuals and draws the best last when points overlap", () => {
		const colors: string[] = [];
		context.fill.mockImplementation(() => colors.push(context.fillStyle));
		const outlines: string[] = [];
		context.stroke.mockImplementation(() => outlines.push(context.strokeStyle));
		const best = { x: 0, y: 0, fitness: 0 };
		render(() => (
			<Visualizer
				population={[best, { x: 0, y: 0, fitness: 1 }]}
				bounds={OBJECTIVE_FUNCTIONS.sphere.bounds}
				generation={0}
				averageFitness={0.5}
				bestIndividual={best}
				functionType="sphere"
			/>
		));
		expect(colors).toEqual(["#1d4ed8", "#b91c1c"]);
		expect(outlines).toEqual(["#fff", "#fff"]);
		expect(context.arc).toHaveBeenLastCalledWith(250, 250, 4, 0, 2 * Math.PI);
	});
});
