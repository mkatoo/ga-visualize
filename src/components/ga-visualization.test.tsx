import {
	cleanup,
	fireEvent,
	render,
	waitFor,
	within,
} from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Individual } from "../genetic-algorithm";
import type { Landscape } from "../landscape";
import * as loader from "../load-3d-visualizer";
import { type FunctionType, OBJECTIVE_FUNCTIONS } from "../objective-functions";
import {
	createRendererMock,
	mock3DVisualizer,
	open3D,
} from "../test-support/three-visualizer";
import {
	displayedGeneration,
	mockCanvasContext,
} from "../test-support/visualization";
import {
	type CameraState,
	ThreeLandscapeRenderer,
} from "../three-landscape-renderer";
import { Visualizer3D } from "../visualizer-3d";
import { GAVisualization } from "./ga-visualization";

vi.mock("../three-landscape-renderer", () => ({
	ThreeLandscapeRenderer: vi.fn(),
}));

describe("2D / 3D visualization", () => {
	let renderer = createRendererMock();
	beforeEach(() => {
		renderer = createRendererMock();
		mock3DVisualizer(renderer);
		mockCanvasContext();
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.clearAllMocks();
		vi.unstubAllGlobals();
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

	test("loads 3D only on selection and shares a fixed landscape across generations and settings", async () => {
		const view = renderPanel();
		expect(loader.load3DVisualizer).not.toHaveBeenCalled();
		expect(ThreeLandscapeRenderer).not.toHaveBeenCalled();
		expect(view.getByText("3D表示設定")).not.toBeVisible();
		await open3D(view);
		expect(view.getByText("3D表示設定")).toBeVisible();
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
		fireEvent.change(view.getByLabelText("高さ・色の尺度"), {
			target: { value: "logarithmic" },
		});
		expect(renderer.updateLandscape).toHaveBeenLastCalledWith(
			model,
			"logarithmic",
			100,
		);
		expect(view.queryByText("線形目盛")).toBeNull();
		expect(view.getByText("対数目盛")).toBeTruthy();
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

	test("keeps the legend in sync with the selected 3D scale and each view's colors", async () => {
		const view = renderPanel();
		const legend = within(
			view.getByRole("figure", { name: "背景色と評価値の対応" }),
		);
		expect(legend.getByText("100")).toBeTruthy();
		expect(legend.queryByText("対数目盛")).toBeNull();
		await open3D(view);
		fireEvent.change(view.getByLabelText(/高さ.*尺度/), {
			target: { value: "logarithmic" },
		});
		expect(legend.getByText("対数目盛")).toBeTruthy();
		expect(legend.getByText("13.2")).toBeTruthy();
		expect(legend.queryByText("100")).toBeNull();
		expect(legend.getByText("200")).toBeTruthy();

		fireEvent.click(view.getByRole("button", { name: "2D" }));
		expect(view.getByText("3D表示設定")).not.toBeVisible();
		expect(legend.queryByText("対数目盛")).toBeNull();
		expect(legend.getByText("100")).toBeTruthy();
		await open3D(view);
		expect(view.getByLabelText("高さ・色の尺度")).toHaveValue("logarithmic");
		expect(legend.getByText("対数目盛")).toBeTruthy();
		expect(legend.getByText("13.2")).toBeTruthy();

		fireEvent.change(view.getByLabelText("高さ・色の尺度"), {
			target: { value: "linear" },
		});
		expect(legend.queryByText("対数目盛")).toBeNull();
		expect(legend.queryByText("線形目盛")).toBeNull();
		expect(legend.getByText("100")).toBeTruthy();

		view.setFunctionType("beale");
		expect(view.getByLabelText("高さ・色の尺度")).toHaveValue("logarithmic");
		expect(legend.getByText("対数目盛")).toBeTruthy();
		fireEvent.change(view.getByLabelText("高さ・色の尺度"), {
			target: { value: "linear" },
		});
		expect(legend.queryByText("対数目盛")).toBeNull();
		fireEvent.click(view.getByRole("button", { name: "2D" }));
		expect(legend.getByText("対数目盛")).toBeTruthy();
	});

	test("restores the camera across view switches, including after an earlier reset", async () => {
		const view = renderPanel();
		await open3D(view);
		fireEvent.click(view.getByRole("button", { name: "視点リセット" }));
		expect(renderer.resetCamera).toHaveBeenCalledTimes(1);
		expect(renderer.resetCamera).toHaveBeenLastCalledWith(false);
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
		expect(view.getByLabelText("高さ・色の尺度")).toHaveValue("logarithmic");
		fireEvent.click(view.getByRole("button", { name: "2D" }));
		renderer.restoreCamera.mockClear();
		await open3D(view);
		expect(renderer.restoreCamera).not.toHaveBeenCalled();
	});

	test("animates camera reset only for a pointer click", async () => {
		const view = renderPanel();
		await open3D(view);
		const reset = view.getByRole("button", { name: "視点リセット" });
		fireEvent.click(reset, { detail: 1 });
		expect(renderer.resetCamera).toHaveBeenLastCalledWith(true);
		fireEvent.click(reset, { detail: 0 });
		expect(renderer.resetCamera).toHaveBeenLastCalledWith(false);
	});

	test("keeps camera reset available in the toolbar while 3D settings are closed", async () => {
		const view = renderPanel();
		const toolbar = within(view.getByRole("group", { name: "表示ツールバー" }));
		expect(toolbar.queryByRole("button", { name: "視点リセット" })).toBeNull();
		fireEvent.click(toolbar.getByRole("button", { name: "3D" }));
		await waitFor(() => expect(ThreeLandscapeRenderer).toHaveBeenCalled());
		expect(view.container.querySelector(".view-settings")).not.toHaveAttribute(
			"open",
		);
		const reset = toolbar.getByRole("button", { name: "視点リセット" });
		expect(reset).toBeVisible();
		expect(reset).toBeEnabled();
		fireEvent.click(reset, { detail: 1 });
		expect(renderer.resetCamera).toHaveBeenLastCalledWith(true);
		fireEvent.click(toolbar.getByRole("button", { name: "2D" }));
		expect(toolbar.queryByRole("button", { name: "視点リセット" })).toBeNull();
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
		expect(view.getByRole("button", { name: "視点リセット" })).toBeDisabled();
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
		expect(displayedGeneration(view)).toHaveTextContent(/^第7世代$/);
		expect(ThreeLandscapeRenderer).not.toHaveBeenCalled();
		await open3D(view);
		expect(view.queryByRole("status")).toBeNull();
	});

	test("returns to 2D when initialization fails", async () => {
		// biome-ignore lint/complexity/useArrowFunction: Vitest 4 invokes this constructor mock with new.
		vi.mocked(ThreeLandscapeRenderer).mockImplementationOnce(function () {
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
		expect(displayedGeneration(view)).toHaveTextContent(/^第7世代$/);
		expect(view.getByTitle("評価値: 5")).toBeTruthy();
	});
});
