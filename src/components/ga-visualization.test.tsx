import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GAApp } from "../ga-app";
import type { Individual } from "../genetic-algorithm";
import type { Landscape } from "../landscape";
import * as loader from "../load-3d-visualizer";
import { type FunctionType, OBJECTIVE_FUNCTIONS } from "../objective-functions";
import {
	type CameraState,
	ThreeLandscapeRenderer,
} from "../three-landscape-renderer";
import { Visualizer3D } from "../visualizer-3d";
import { GAVisualization } from "./ga-visualization";

vi.mock("../three-landscape-renderer", () => ({
	ThreeLandscapeRenderer: vi.fn(),
}));

const createRenderer = () => ({
	updateLandscape: vi.fn(),
	updatePopulation: vi.fn(),
	setWireframe: vi.fn(),
	restoreCamera: vi.fn(),
	resetCamera: vi.fn(),
	dispose: vi.fn(),
});

describe("2D / 3D visualization", () => {
	let renderer = createRenderer();
	beforeEach(() => {
		renderer = createRenderer();
		vi.mocked(ThreeLandscapeRenderer).mockImplementation(
			() => renderer as unknown as ThreeLandscapeRenderer,
		);
		vi.spyOn(loader, "load3DVisualizer").mockResolvedValue({ Visualizer3D });
		const context = {
			clearRect: vi.fn(),
			beginPath: vi.fn(),
			moveTo: vi.fn(),
			lineTo: vi.fn(),
			stroke: vi.fn(),
			strokeText: vi.fn(),
			fillText: vi.fn(),
			arc: vi.fn(),
			fill: vi.fn(),
			drawImage: vi.fn(),
			putImageData: vi.fn(),
			createImageData: (w: number, h: number) => ({
				data: new Uint8ClampedArray(w * h * 4),
			}),
		};
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			context as unknown as CanvasRenderingContext2D,
		);
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	const renderPanel = () => {
		const best = { x: 1, y: 2, fitness: 5 };
		const [population, setPopulation] = createSignal<Individual[]>([best]);
		const [functionType, setFunctionType] =
			createSignal<FunctionType>("sphere");
		const view = render(() => (
			<GAVisualization
				population={population()}
				bestIndividual={best}
				generation={7}
				averageFitness={5}
				functionType={functionType()}
				bounds={{ ...OBJECTIVE_FUNCTIONS[functionType()].bounds }}
			/>
		));
		return { ...view, best, population, setPopulation, setFunctionType };
	};
	const open3D = async (view: ReturnType<typeof render>) => {
		fireEvent.click(view.getByRole("button", { name: "3D" }));
		await waitFor(() => expect(ThreeLandscapeRenderer).toHaveBeenCalled());
	};

	test("loads 3D only on selection and shares a fixed landscape across generations and settings", async () => {
		const view = renderPanel();
		expect(loader.load3DVisualizer).not.toHaveBeenCalled();
		expect(ThreeLandscapeRenderer).not.toHaveBeenCalled();
		await open3D(view);
		const model: Landscape = renderer.updateLandscape.mock.calls[0][0];
		expect(model.colorScale.maximum).toBe(200);
		expect(renderer.updatePopulation).toHaveBeenLastCalledWith(
			view.population(),
			view.best,
		);
		view.setPopulation([{ x: 3, y: 4, fitness: 25 }, view.best]);
		expect(renderer.updatePopulation).toHaveBeenLastCalledWith(
			view.population(),
			view.best,
		);
		fireEvent.change(view.getByLabelText("高さの尺度"), {
			target: { value: "logarithmic" },
		});
		expect(renderer.updateLandscape).toHaveBeenLastCalledWith(
			model,
			"logarithmic",
			100,
		);
		expect(view.getByText("線形目盛")).toBeTruthy();
		fireEvent.change(view.getByLabelText("曲面の分割数"), {
			target: { value: "64" },
		});
		expect(renderer.updateLandscape).toHaveBeenLastCalledWith(
			model,
			"logarithmic",
			64,
		);
		fireEvent.click(view.getByLabelText("格子線のみ"));
		expect(renderer.setWireframe).toHaveBeenLastCalledWith(true);
		expect(renderer.resetCamera).not.toHaveBeenCalled();
	});

	test("restores the camera across view switches, including after an earlier reset", async () => {
		const view = renderPanel();
		await open3D(view);
		fireEvent.click(view.getByRole("button", { name: "視点リセット" }));
		expect(renderer.resetCamera).toHaveBeenCalledTimes(1);
		const camera: CameraState = {
			position: [2, -3, 4],
			target: [0.2, 0.1, 0.5],
		};
		vi.mocked(ThreeLandscapeRenderer).mock.calls[0][1](camera);
		fireEvent.click(view.getByRole("button", { name: "2D" }));
		expect(renderer.dispose).toHaveBeenCalledTimes(1);
		await open3D(view);
		expect(renderer.restoreCamera).toHaveBeenLastCalledWith(camera);
		expect(renderer.resetCamera).toHaveBeenCalledTimes(1);
		view.setFunctionType("beale");
		expect(renderer.updateLandscape.mock.lastCall?.[0].functionType).toBe(
			"beale",
		);
		expect(view.getByLabelText("高さの尺度")).toHaveValue("logarithmic");
		fireEvent.click(view.getByRole("button", { name: "2D" }));
		renderer.restoreCamera.mockClear();
		await open3D(view);
		expect(renderer.restoreCamera).not.toHaveBeenCalled();
	});

	test("does not create a renderer after returning to 2D during loading", async () => {
		let resolve!: (module: typeof import("../visualizer-3d")) => void;
		vi.mocked(loader.load3DVisualizer).mockReturnValueOnce(
			new Promise((r) => {
				resolve = r;
			}),
		);
		const view = renderPanel();
		fireEvent.click(view.getByRole("button", { name: "3D" }));
		expect(view.getByRole("status")).toHaveTextContent("読み込んでいます");
		fireEvent.click(view.getByRole("button", { name: "2D" }));
		resolve({ Visualizer3D });
		await Promise.resolve();
		expect(ThreeLandscapeRenderer).not.toHaveBeenCalled();
		expect(view.getByRole("button", { name: "2D" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	test("returns to 2D on a load failure and permits an explicit retry", async () => {
		vi.mocked(loader.load3DVisualizer).mockRejectedValueOnce(
			new Error("offline"),
		);
		const view = renderPanel();
		fireEvent.click(view.getByRole("button", { name: "3D" }));
		await waitFor(() =>
			expect(view.getByRole("status")).toHaveTextContent("読み込みに失敗"),
		);
		expect(view.getByRole("button", { name: "2D" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(view.getByText("7")).toBeTruthy();
		expect(ThreeLandscapeRenderer).not.toHaveBeenCalled();
		await open3D(view);
		expect(view.queryByRole("status")).toBeNull();
	});

	test("returns to 2D when initialization fails", async () => {
		vi.mocked(ThreeLandscapeRenderer).mockImplementationOnce(() => {
			throw new Error("WebGL 2を利用できません。");
		});
		const view = renderPanel();
		await open3D(view);
		expect(view.getByRole("status")).toHaveTextContent(
			"WebGL 2を利用できません",
		);
		expect(view.getByRole("button", { name: "2D" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	test("disposes the renderer and retains statistics on context loss", async () => {
		const view = renderPanel();
		await open3D(view);
		vi.mocked(ThreeLandscapeRenderer).mock.calls[0][2](
			"WebGLの描画コンテキストが失われました。",
		);
		expect(renderer.dispose).toHaveBeenCalledTimes(1);
		expect(view.getByRole("status")).toHaveTextContent(
			"コンテキストが失われました",
		);
		expect(view.getByText("7")).toBeTruthy();
		expect(view.getByTitle("適応度: 5")).toBeTruthy();
	});

	test("keeps the GA running and its current population when switching views", async () => {
		const view = render(() => <GAApp />);
		await open3D(view);
		const population = renderer.updatePopulation.mock.lastCall?.[0];
		vi.useFakeTimers();
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		vi.advanceTimersByTime(500);
		expect(view.container.querySelector(".stat-item .value")).toHaveTextContent(
			"1",
		);
		expect(renderer.updatePopulation.mock.lastCall?.[0]).not.toEqual(
			population,
		);
		const generationOnePopulation =
			renderer.updatePopulation.mock.lastCall?.[0];
		fireEvent.click(view.getByRole("button", { name: "2D" }));
		fireEvent.click(view.getByRole("button", { name: "3D" }));
		await Promise.resolve();
		expect(renderer.updatePopulation).toHaveBeenLastCalledWith(
			generationOnePopulation,
			expect.any(Object),
		);
		expect(view.getByRole("button", { name: "一時停止" })).toBeEnabled();
		vi.advanceTimersByTime(500);
		expect(view.container.querySelector(".stat-item .value")).toHaveTextContent(
			"2",
		);
	});

	test("pauses, resumes, steps, and resets using the unified playback controls", () => {
		const view = render(() => <GAApp />);
		const generation = () => view.container.querySelector(".stat-item .value");
		const stepButton = view.getByRole("button", { name: "1世代進める" });
		vi.useFakeTimers();

		fireEvent.click(view.getByRole("button", { name: "開始" }));
		expect(stepButton).toBeDisabled();
		expect(view.getByLabelText("最適化関数:")).toBeDisabled();
		vi.advanceTimersByTime(500);
		expect(generation()).toHaveTextContent(/^1$/);
		expect(
			Array.from(
				view.container.querySelectorAll(".fitness-chart polyline"),
				(line) => line.getAttribute("points")?.split(" ").length,
			),
		).toEqual([2, 2]);

		fireEvent.click(view.getByRole("button", { name: "一時停止" }));
		expect(view.getByRole("button", { name: "開始" })).toBeEnabled();
		expect(stepButton).toBeEnabled();
		expect(view.getByLabelText("最適化関数:")).toBeEnabled();
		vi.advanceTimersByTime(1500);
		expect(generation()).toHaveTextContent(/^1$/);

		fireEvent.click(stepButton);
		expect(generation()).toHaveTextContent(/^2$/);
		vi.advanceTimersByTime(1000);
		expect(generation()).toHaveTextContent(/^2$/);

		fireEvent.click(view.getByRole("button", { name: "開始" }));
		vi.advanceTimersByTime(500);
		expect(generation()).toHaveTextContent(/^3$/);

		fireEvent.click(view.getByRole("button", { name: "リセット" }));
		expect(view.getByRole("button", { name: "開始" })).toBeEnabled();
		expect(stepButton).toBeEnabled();
		expect(generation()).toHaveTextContent(/^0$/);
		expect(
			view.container.querySelectorAll(".fitness-chart polyline"),
		).toHaveLength(0);
		expect(
			view.container.querySelectorAll(".fitness-chart circle"),
		).toHaveLength(2);
		vi.advanceTimersByTime(1000);
		expect(generation()).toHaveTextContent(/^0$/);
	});
});
