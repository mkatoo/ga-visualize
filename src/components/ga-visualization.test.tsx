import {
	cleanup,
	fireEvent,
	render,
	waitFor,
	within,
} from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GAApp } from "../ga-app";
import { GeneticAlgorithm, type Individual } from "../genetic-algorithm";
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

const displayedGeneration = (view: ReturnType<typeof render>) =>
	within(view.getByRole("region", { name: "表示中の世代の要約" })).getByText(
		/^(第\d+世代|履歴表示中：第\d+／\d+世代)$/,
	);

describe("2D / 3D visualization", () => {
	let renderer = createRenderer();
	beforeEach(() => {
		renderer = createRenderer();
		// biome-ignore lint/complexity/useArrowFunction: Vitest 4 invokes this constructor mock with new.
		vi.mocked(ThreeLandscapeRenderer).mockImplementation(function () {
			return renderer as unknown as ThreeLandscapeRenderer;
		});
		vi.spyOn(loader, "load3DVisualizer").mockResolvedValue({ Visualizer3D });
		const context = {
			clearRect: vi.fn(),
			setTransform: vi.fn(),
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
	const open3D = async (view: ReturnType<typeof render>) => {
		fireEvent.click(view.getByRole("button", { name: "3D" }));
		await waitFor(() => expect(ThreeLandscapeRenderer).toHaveBeenCalled());
		const settings = view.container.querySelector(".view-settings");
		if (!settings?.hasAttribute("open"))
			fireEvent.click(view.getByText("3D表示設定"));
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

	test("keeps the GA running and its current population when switching views", async () => {
		const view = render(() => <GAApp />);
		await open3D(view);
		const population = renderer.updatePopulation.mock.lastCall?.[0];
		vi.useFakeTimers();
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		vi.advanceTimersByTime(500);
		expect(displayedGeneration(view)).toHaveTextContent("第1世代");
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
		expect(displayedGeneration(view)).toHaveTextContent("第2世代");
	});

	test("pauses, resumes, steps, and resets using the unified playback controls", () => {
		const view = render(() => <GAApp />);
		const generation = () => displayedGeneration(view);
		const stepButton = view.getByRole("button", { name: "1世代進める" });
		vi.useFakeTimers();

		fireEvent.click(view.getByRole("button", { name: "開始" }));
		expect(stepButton).toBeDisabled();
		expect(view.getByLabelText("目的関数:")).toBeDisabled();
		vi.advanceTimersByTime(500);
		expect(generation()).toHaveTextContent(/^第1世代$/);
		expect(
			Array.from(
				view.container.querySelectorAll(".fitness-chart polyline"),
				(line) => line.getAttribute("points")?.split(" ").length,
			),
		).toEqual([2, 2]);

		fireEvent.click(view.getByRole("button", { name: "一時停止" }));
		expect(view.getByRole("button", { name: "再開" })).toBeEnabled();
		expect(stepButton).toBeEnabled();
		expect(view.getByLabelText("目的関数:")).toBeDisabled();
		vi.advanceTimersByTime(1500);
		expect(generation()).toHaveTextContent(/^第1世代$/);

		fireEvent.click(stepButton);
		expect(generation()).toHaveTextContent(/^第2世代$/);
		vi.advanceTimersByTime(1000);
		expect(generation()).toHaveTextContent(/^第2世代$/);

		fireEvent.click(view.getByRole("button", { name: "再開" }));
		vi.advanceTimersByTime(500);
		expect(generation()).toHaveTextContent(/^第3世代$/);

		fireEvent.click(view.getByRole("button", { name: "リセット" }));
		expect(view.getByRole("button", { name: "開始" })).toBeEnabled();
		expect(stepButton).toBeEnabled();
		expect(generation()).toHaveTextContent(/^第0世代$/);
		expect(
			view.container.querySelectorAll(".fitness-chart polyline"),
		).toHaveLength(0);
		expect(
			view.container.querySelectorAll(".fitness-chart circle"),
		).toHaveLength(2);
		vi.advanceTimersByTime(1000);
		expect(generation()).toHaveTextContent(/^第0世代$/);
	});

	test("synchronizes history with the 3D population, statistics and chart", async () => {
		const view = render(() => <GAApp />);
		const panel = view.container.querySelector(".visualization-panel");
		expect(panel).toContainElement(
			view.container.querySelector(".fitness-chart"),
		);
		expect(
			within(
				view.getByRole("region", { name: "表示中の世代の要約" }),
			).getAllByRole("definition"),
		).toHaveLength(3);
		expect(
			within(view.getByRole("list", { name: "推移グラフの凡例" })).getAllByRole(
				"listitem",
			),
		).toHaveLength(2);
		expect(
			within(
				view.container.querySelector(".fitness-chart") as HTMLElement,
			).queryByRole("definition"),
		).toBeNull();
		expect(
			within(
				view.container.querySelector(".fitness-chart") as HTMLElement,
			).getByText("最良評価値"),
		).toBeVisible();
		expect(
			within(
				view.container.querySelector(".fitness-chart") as HTMLElement,
			).getByText("平均評価値"),
		).toBeVisible();
		const toolbar = within(view.getByRole("region", { name: "世代の履歴" }));
		const slider = toolbar.getByRole("slider", {
			name: "表示世代のスライダー",
		});
		const generationInput = toolbar.getByRole("spinbutton", {
			name: "表示世代",
		});
		expect(slider).toBeDisabled();
		expect(generationInput).toBeDisabled();
		expect(
			within(
				view.container.querySelector(".fitness-chart") as HTMLElement,
			).queryByRole("spinbutton"),
		).toBeNull();
		await open3D(view);
		vi.useFakeTimers();
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		vi.advanceTimersByTime(500);
		const generationOne = renderer.updatePopulation.mock.lastCall?.[0];
		const summaryMetrics = () =>
			Array.from(
				view.container.querySelectorAll(".generation-summary dd"),
				(value) => value.textContent,
			);
		const generationOneStatistics = summaryMetrics();
		const readout = view.getByRole("region", { name: "表示中の世代の要約" });
		fireEvent.click(view.getByText("結果の詳細"));
		const coordinates = view.getByRole("region", {
			name: "第1世代の最良個体",
		});
		const generationOneCoordinates = coordinates.textContent;
		expect(within(coordinates).getByText("座標")).toBeVisible();
		vi.advanceTimersByTime(1000);
		fireEvent.input(slider, {
			target: { value: "1" },
		});
		expect(view.getByRole("button", { name: "最新から再開" })).toBeEnabled();
		expect(renderer.updatePopulation.mock.lastCall?.[0]).toEqual(generationOne);
		expect(displayedGeneration(view)).toHaveTextContent(
			"履歴表示中：第1／3世代",
		);
		expect(generationInput).toHaveValue(1);
		expect(coordinates.textContent).toBe(generationOneCoordinates);
		expect(coordinates).toBeVisible();
		expect(summaryMetrics()).toEqual(generationOneStatistics);
		fireEvent.input(generationInput, {
			target: { value: "2" },
		});
		expect(slider).toHaveValue("1");
		fireEvent.keyDown(generationInput, { key: "Enter" });
		expect(slider).toHaveValue("2");
		expect(displayedGeneration(view)).toHaveTextContent(
			"履歴表示中：第2／3世代",
		);
		fireEvent.click(view.getByRole("button", { name: "最新世代に戻る" }));
		expect(slider).toHaveValue("3");
		expect(generationInput).toHaveValue(3);
		expect(readout).toHaveTextContent("第3世代");
		fireEvent.input(generationInput, { target: { value: "99" } });
		fireEvent.blur(generationInput);
		expect(generationInput).toHaveValue(99);
		expect(generationInput).toHaveAttribute("aria-invalid", "true");
		expect(view.getByText("0〜3の整数を入力してください。")).toBeVisible();
		fireEvent.input(generationInput, { target: { value: "-1" } });
		fireEvent.keyDown(generationInput, { key: "Enter" });
		expect(generationInput).toHaveValue(-1);
		expect(slider).toHaveValue("3");
		fireEvent.input(generationInput, { target: { value: "1.6" } });
		fireEvent.blur(generationInput);
		expect(generationInput).toHaveAttribute("aria-invalid", "true");
		expect(slider).toHaveValue("3");
		fireEvent.input(generationInput, { target: { value: "2" } });
		fireEvent.blur(generationInput);
		expect(generationInput).toHaveValue(2);
		expect(slider).toHaveValue("2");
		fireEvent.input(generationInput, { target: { value: "" } });
		fireEvent.blur(generationInput);
		expect(generationInput).toHaveAttribute("aria-invalid", "true");
		fireEvent.keyDown(generationInput, { key: "Escape" });
		expect(generationInput).toHaveValue(2);
		vi.stubGlobal("PointerEvent", MouseEvent);
		const chart = view.getByRole("img", {
			name: "遺伝的アルゴリズムの評価値推移グラフ",
		});
		vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({
			left: 0,
			top: 0,
			width: 640,
			height: 260,
		} as DOMRect);
		fireEvent.pointerDown(chart, { clientX: 100, clientY: 100 });
		fireEvent.pointerUp(chart, { clientX: 100, clientY: 100 });
		expect(generationInput).toHaveValue(1);
		expect(slider).toHaveValue("1");
		expect(summaryMetrics()).toEqual(generationOneStatistics);
		expect(renderer.updatePopulation.mock.lastCall?.[0]).toEqual(generationOne);
		fireEvent.click(view.getByRole("button", { name: "最新から再開" }));
		vi.advanceTimersByTime(500);
		expect(displayedGeneration(view)).toHaveTextContent(/^第4世代$/);
		expect(generationInput).toHaveValue(4);
		expect(slider).toHaveValue("4");
		expect(readout).toHaveTextContent("第4世代");
		fireEvent.click(view.getByRole("button", { name: "リセット" }));
		expect(generationInput).toHaveValue(0);
		expect(slider).toHaveValue("0");
		expect(generationInput).toBeDisabled();
		expect(readout).toHaveTextContent("第0世代");
	});

	test("keeps a generation draft while playback advances and pauses only on commit", () => {
		vi.useFakeTimers();
		const view = render(() => <GAApp />);
		const input = view.getByRole("spinbutton", { name: "表示世代" });
		const slider = view.getByRole("slider", { name: "表示世代のスライダー" });
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		vi.advanceTimersByTime(1500);
		fireEvent.input(input, { target: { value: "1" } });
		vi.advanceTimersByTime(500);
		expect(input).toHaveValue(1);
		expect(slider).toHaveValue("4");
		expect(view.getByRole("status")).toHaveTextContent("実行中");
		fireEvent.keyDown(input, { key: "Enter" });
		expect(slider).toHaveValue("1");
		expect(view.getByRole("status")).toHaveTextContent("一時停止中");
		fireEvent.input(input, { target: { value: "99" } });
		fireEvent.click(view.getByRole("button", { name: "リセット" }));
		expect(input).toHaveValue(0);
		expect(input).toBeDisabled();
		expect(input).toHaveAttribute("aria-invalid", "false");
	});

	test("shows completion and offers a new run instead of inactive playback", () => {
		vi.useFakeTimers();
		const view = render(() => <GAApp />);
		fireEvent.input(view.getByLabelText("世代数 (1-1000):"), {
			target: { value: "1" },
		});
		fireEvent.blur(view.getByLabelText("世代数 (1-1000):"));
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		fireEvent.click(view.getByRole("button", { name: "一時停止" }));
		expect(view.getByRole("status")).toHaveTextContent("一時停止中");
		fireEvent.click(view.getByRole("button", { name: "再開" }));
		vi.advanceTimersByTime(500);
		expect(view.getByRole("status")).toHaveTextContent("実行が完了しました");
		expect(view.getByRole("button", { name: "1世代進める" })).toBeDisabled();
		expect(view.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
		expect(view.queryByText(/1世代の探索が終了しました/)).toBeNull();
		fireEvent.click(view.getByRole("button", { name: "もう一度実行" }));
		expect(view.getByRole("status")).toHaveTextContent("実行中");
		expect(displayedGeneration(view)).toHaveTextContent(/^第0世代$/);
		vi.advanceTimersByTime(500);
		expect(view.getByRole("status")).toHaveTextContent("実行が完了しました");
	});

	test("labels historical results separately from a completed run and restores the latest result", () => {
		vi.useFakeTimers();
		const view = render(() => <GAApp />);
		const summary = view.getByRole("region", { name: "表示中の世代の要約" });
		const bestEver = () => summary.querySelector(".summary-best-ever dd");
		fireEvent.input(view.getByLabelText("世代数 (1-1000):"), {
			target: { value: "3" },
		});
		fireEvent.blur(view.getByLabelText("世代数 (1-1000):"));
		const initialBest = bestEver()?.textContent;
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		vi.advanceTimersByTime(1500);
		const latestBest = bestEver()?.textContent;

		fireEvent.input(
			view.getByRole("slider", { name: "表示世代のスライダー" }),
			{
				target: { value: "0" },
			},
		);
		expect(displayedGeneration(view)).toHaveTextContent(
			"履歴表示中：第0／3世代",
		);
		expect(within(summary).getByText("第0世代までの最良")).toBeVisible();
		expect(bestEver()).toHaveTextContent(initialBest ?? "");
		expect(view.getByRole("status")).toHaveTextContent("実行が完了しました");

		fireEvent.click(view.getByRole("button", { name: "最新世代に戻る" }));
		expect(displayedGeneration(view)).toHaveTextContent(/^第3世代$/);
		expect(summary).not.toHaveTextContent("履歴表示中");
		expect(within(summary).getByText("第3世代までの最良")).toBeVisible();
		expect(bestEver()).toHaveTextContent(latestBest ?? "");
		fireEvent.click(view.getByRole("button", { name: "リセット" }));
		expect(displayedGeneration(view)).toHaveTextContent(/^第0世代$/);
		expect(summary).not.toHaveTextContent("履歴表示中");
	});

	test("commits numeric settings on blur or Enter and explains invalid drafts", () => {
		const view = render(() => <GAApp />);
		const population = view.getByLabelText("個体数 (1-1000):");
		const generations = view.getByLabelText("世代数 (1-1000):");
		const results = view.getByRole("region", { name: "表示中の世代の要約" });
		const initialResults = results.textContent;
		const overview = view.container.querySelector(".settings-overview");
		fireEvent.input(population, { target: { value: "1" } });
		fireEvent.input(population, { target: { value: "150" } });
		expect(results.textContent).toBe(initialResults);
		expect(overview).toHaveTextContent("50個体");
		fireEvent.blur(population);
		expect(overview).toHaveTextContent("150個体");
		fireEvent.input(generations, { target: { value: "1001" } });
		fireEvent.blur(generations);
		expect(generations).toHaveValue(1001);
		expect(generations).toHaveAttribute("aria-invalid", "true");
		expect(view.getByText("1〜1000の整数を入力してください。")).toBeVisible();
		expect(view.getByRole("button", { name: "開始" })).toBeDisabled();
		fireEvent.keyDown(generations, { key: "Escape" });
		expect(generations).toHaveValue(20);
		expect(view.getByRole("button", { name: "開始" })).toBeEnabled();
		fireEvent.input(generations, { target: { value: "1e2" } });
		fireEvent.keyDown(generations, { key: "Enter" });
		expect(generations).toHaveValue(100);
		expect(overview).toHaveTextContent("100世代");
		fireEvent.input(population, { target: { value: "" } });
		fireEvent.click(view.getByRole("button", { name: "リセット" }));
		expect(population).toHaveValue(150);
		expect(view.getByRole("button", { name: "開始" })).toBeEnabled();
	});

	test("keeps validation visible when settings close and returns focus to the invalid field", () => {
		const view = render(() => <GAApp />);
		const settings =
			view.container.querySelector<HTMLDetailsElement>(".settings-details");
		const population = view.getByLabelText("個体数 (1-1000):");
		const generations = view.getByLabelText("世代数 (1-1000):");
		fireEvent.input(population, { target: { value: "" } });
		fireEvent.input(generations, { target: { value: "1001" } });
		if (!settings) throw new Error("Settings are missing");
		settings.open = false;
		expect(view.getByText("入力エラーがあります。")).toBeVisible();
		expect(view.getByText("入力エラー")).toBeVisible();
		expect(view.getByRole("button", { name: "開始" })).toBeDisabled();
		fireEvent.click(view.getByRole("button", { name: "設定を確認" }));
		expect(settings.open).toBe(true);
		expect(population).toHaveFocus();
		fireEvent.keyDown(population, { key: "Escape" });
		fireEvent.click(view.getByRole("button", { name: "設定を確認" }));
		expect(generations).toHaveFocus();
		fireEvent.keyDown(generations, { key: "Escape" });
		expect(view.queryByText("入力エラーがあります。")).toBeNull();
		expect(view.getByRole("button", { name: "開始" })).toBeEnabled();
	});

	test("commits advanced settings on blur or Enter and restores only their defaults", () => {
		const view = render(() => <GAApp />);
		fireEvent.click(view.getByText("詳細設定"));
		const mutation = view.getByLabelText("突然変異率 (0〜1)");
		const crossover = view.getByLabelText("交叉率 (0〜1)");
		const tournament = view.getByLabelText("トーナメントサイズ (1〜1000)");
		const restore = view.getByRole("button", {
			name: "詳細設定を初期値に戻す",
		});
		expect(mutation).toHaveValue(0.1);
		expect(crossover).toHaveValue(0.8);
		expect(tournament).toHaveValue(3);
		expect(mutation).toHaveAccessibleDescription(/0.1 は10%.*初期値: 0.1/);
		expect(crossover).toHaveAccessibleDescription(/0.8 は80%.*初期値: 0.8/);
		expect(tournament).toHaveAccessibleDescription(/親を選ぶ候補の数/);
		const population = view.getByLabelText("個体数 (1-1000):");
		fireEvent.input(population, { target: { value: "12" } });
		fireEvent.blur(population);
		const initialize = vi.spyOn(
			GeneticAlgorithm.prototype,
			"initializePopulation",
		);
		fireEvent.input(mutation, { target: { value: "0.125" } });
		expect(initialize).not.toHaveBeenCalled();
		fireEvent.blur(mutation);
		expect(mutation).toHaveValue(0.125);
		expect(initialize).toHaveBeenCalledTimes(1);
		fireEvent.input(crossover, { target: { value: "0" } });
		fireEvent.keyDown(crossover, { key: "Enter" });
		expect(initialize).toHaveBeenCalledTimes(2);
		fireEvent.input(tournament, { target: { value: "7" } });
		fireEvent.blur(tournament);
		expect(initialize).toHaveBeenCalledTimes(3);
		fireEvent.input(mutation, { target: { value: "" } });
		fireEvent.click(view.getByRole("button", { name: "リセット" }));
		expect(mutation).toHaveValue(0.125);
		expect(crossover).toHaveValue(0);
		expect(tournament).toHaveValue(7);
		initialize.mockClear();
		fireEvent.input(tournament, { target: { value: "1.5" } });
		fireEvent.click(restore);
		expect(mutation).toHaveValue(0.1);
		expect(crossover).toHaveValue(0.8);
		expect(tournament).toHaveValue(3);
		expect(population).toHaveValue(12);
		expect(initialize).toHaveBeenCalledTimes(1);
		expect(view.queryByText("入力エラーがあります。")).toBeNull();
		fireEvent.input(mutation, { target: { value: "" } });
		fireEvent.click(restore);
		expect(mutation).toHaveValue(0.1);
		expect(initialize).toHaveBeenCalledTimes(1);
		expect(view.getByRole("button", { name: "開始" })).toBeEnabled();
	});

	test.each([
		{ label: "突然変異率 (0〜1)", initial: 0.1, invalid: ["", "-0.1", "1.1"] },
		{ label: "交叉率 (0〜1)", initial: 0.8, invalid: ["", "-0.1", "1.1"] },
		{
			label: "トーナメントサイズ (1〜1000)",
			initial: 3,
			invalid: ["", "0", "1001", "1.5"],
		},
	])(
		"validates $label even when both settings panels are closed",
		({ label, initial, invalid }) => {
			const view = render(() => <GAApp />);
			const settings =
				view.container.querySelector<HTMLDetailsElement>(".settings-details");
			const advanced =
				view.container.querySelector<HTMLDetailsElement>(".advanced-settings");
			if (!settings || !advanced) throw new Error("Settings are missing");
			const input = view.getByLabelText(label);
			for (const value of invalid) {
				advanced.open = true;
				fireEvent.input(input, { target: { value } });
				fireEvent.blur(input);
				expect(input).toHaveAttribute("aria-invalid", "true");
				expect(input).toHaveAccessibleDescription(/入力してください/);
				advanced.open = false;
				settings.open = false;
				expect(view.getByText("入力エラーがあります。")).toBeVisible();
				expect(view.getByRole("button", { name: "開始" })).toBeDisabled();
				expect(
					view.getByRole("button", { name: "1世代進める" }),
				).toBeDisabled();
				fireEvent.click(view.getByRole("button", { name: "設定を確認" }));
				expect(settings.open).toBe(true);
				expect(advanced.open).toBe(true);
				expect(input).toHaveFocus();
				fireEvent.keyDown(input, { key: "Escape" });
				expect(input).toHaveValue(initial);
				expect(view.getByRole("button", { name: "開始" })).toBeEnabled();
			}
		},
	);

	test("keeps other drafts intact when an advanced setting is committed or restored", () => {
		const view = render(() => <GAApp />);
		fireEvent.click(view.getByText("詳細設定"));
		const mutation = view.getByLabelText("突然変異率 (0〜1)");
		const crossover = view.getByLabelText("交叉率 (0〜1)");
		const population = view.getByLabelText("個体数 (1-1000):");
		fireEvent.input(mutation, { target: { value: "" } });
		fireEvent.input(crossover, { target: { value: "0.25" } });
		fireEvent.blur(crossover);
		expect(mutation).toHaveValue(null);
		expect(mutation).toHaveAttribute("aria-invalid", "true");
		fireEvent.input(population, { target: { value: "" } });
		fireEvent.click(
			view.getByRole("button", { name: "詳細設定を初期値に戻す" }),
		);
		expect(mutation).toHaveValue(0.1);
		expect(crossover).toHaveValue(0.8);
		expect(population).toHaveValue(null);
		expect(view.getByRole("button", { name: "開始" })).toBeDisabled();
	});

	test("updates progress immediately for manual steps, fast playback, completion and reset", () => {
		vi.useFakeTimers();
		const view = render(() => <GAApp />);
		const fill = view.container.querySelector(".progress-fill");
		fireEvent.click(view.getByRole("button", { name: "1世代進める" }));
		expect(fill).toHaveStyle({ transform: "scaleX(0.05)" });
		expect(fill).toHaveAttribute("data-smooth", "false");
		fireEvent.click(view.getByRole("button", { name: "再開" }));
		vi.advanceTimersByTime(500);
		expect(fill).toHaveStyle({ transform: "scaleX(0.1)" });
		expect(fill).toHaveAttribute("data-smooth", "true");
		fireEvent.input(view.getByLabelText("アニメーション速度:"), {
			target: { value: "1950" },
		});
		vi.advanceTimersByTime(50);
		expect(fill).toHaveStyle({ transform: "scaleX(0.15)" });
		expect(fill).toHaveAttribute("data-smooth", "false");
		fireEvent.click(view.getByRole("button", { name: "リセット" }));
		expect(fill).toHaveStyle({ transform: "scaleX(0)" });
		expect(fill).toHaveAttribute("data-smooth", "false");
		const generations = view.getByLabelText("世代数 (1-1000):");
		fireEvent.input(generations, { target: { value: "1" } });
		fireEvent.blur(generations);
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		vi.advanceTimersByTime(50);
		expect(fill).toHaveStyle({ transform: "scaleX(1)" });
		expect(fill).toHaveAttribute("data-smooth", "false");
	});

	test("requires reset to change settings after starting or completing a run", () => {
		vi.useFakeTimers();
		const view = render(() => <GAApp />);
		fireEvent.click(view.getByText("詳細設定"));
		const advancedControls = [
			view.getByLabelText("突然変異率 (0〜1)"),
			view.getByLabelText("交叉率 (0〜1)"),
			view.getByLabelText("トーナメントサイズ (1〜1000)"),
			view.getByRole("button", { name: "詳細設定を初期値に戻す" }),
		];
		const generations = view.getByLabelText("世代数 (1-1000):");
		fireEvent.input(generations, { target: { value: "1" } });
		fireEvent.keyDown(generations, { key: "Enter" });
		expect(view.queryByText(/適用して/)).toBeNull();
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		for (const control of advancedControls) expect(control).toBeDisabled();
		fireEvent.click(view.getByRole("button", { name: "一時停止" }));
		for (const control of advancedControls) expect(control).toBeDisabled();
		expect(generations).toBeDisabled();
		expect(view.getByLabelText("個体数 (1-1000):")).toBeDisabled();
		expect(view.getByLabelText("目的関数:")).toBeDisabled();
		expect(
			view.getByText("設定を変更するにはリセットしてください。"),
		).toBeTruthy();
		fireEvent.click(view.getByRole("button", { name: "再開" }));
		vi.advanceTimersByTime(500);
		for (const control of advancedControls) expect(control).toBeDisabled();
		expect(generations).toBeDisabled();
		fireEvent.click(view.getByRole("button", { name: "リセット" }));
		for (const control of advancedControls) expect(control).toBeEnabled();
		expect(generations).toBeEnabled();
		expect(view.getByLabelText("目的関数:")).toBeEnabled();
		expect(
			view.queryByText("設定を変更するにはリセットしてください。"),
		).toBeNull();
	});

	test("preserves settings and a running simulation when switching mobile and desktop layouts", () => {
		const listeners = new Set<(event: MediaQueryListEvent) => void>();
		const media = {
			matches: true,
			addEventListener: vi.fn(
				(_type: string, listener: (event: MediaQueryListEvent) => void) => {
					listeners.add(listener);
				},
			),
			removeEventListener: vi.fn(
				(_type: string, listener: (event: MediaQueryListEvent) => void) => {
					listeners.delete(listener);
				},
			),
		};
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => media),
		);
		const setMobile = (matches: boolean) => {
			media.matches = matches;
			for (const listener of listeners) {
				listener({ matches } as MediaQueryListEvent);
			}
		};
		const view = render(() => <GAApp />);
		const settings = view.container.querySelector(".settings-details");
		const summary = view.container.querySelector("summary");
		const generation = () => displayedGeneration(view);
		expect(settings).not.toHaveAttribute("open");
		const speed = view.getByRole("slider", { name: "アニメーション速度:" });
		expect(speed).toBeVisible();
		if (!summary) throw new Error("Settings summary is missing");
		fireEvent.click(summary);
		expect(settings).toHaveAttribute("open");
		fireEvent.input(view.getByLabelText("個体数 (1-1000):"), {
			target: { value: "150" },
		});
		fireEvent.blur(view.getByLabelText("個体数 (1-1000):"));
		fireEvent.input(view.getByLabelText("世代数 (1-1000):"), {
			target: { value: "75" },
		});
		fireEvent.blur(view.getByLabelText("世代数 (1-1000):"));
		fireEvent.change(view.getByLabelText("目的関数:"), {
			target: { value: "ackley" },
		});
		expect(view.getByText("0.5秒／世代")).toBeTruthy();
		fireEvent.input(view.getByLabelText("アニメーション速度:"), {
			target: { value: "1000" },
		});
		expect(view.getByText("1秒／世代")).toBeTruthy();
		expect(view.getByLabelText("アニメーション速度:")).toHaveAttribute(
			"aria-valuetext",
			"1秒／世代",
		);
		expect(summary).toHaveTextContent(OBJECTIVE_FUNCTIONS.ackley.name);
		expect(summary).toHaveTextContent("150個体・75世代");
		fireEvent.click(summary);
		expect(settings).not.toHaveAttribute("open");

		vi.useFakeTimers();
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		vi.advanceTimersByTime(1000);
		expect(generation()).toHaveTextContent(/^第1世代$/);
		setMobile(false);
		expect(settings).toHaveAttribute("open");
		expect(view.getByLabelText("個体数 (1-1000):")).toHaveValue(150);
		expect(view.getByLabelText("世代数 (1-1000):")).toHaveValue(75);
		expect(view.getByLabelText("目的関数:")).toHaveValue("ackley");
		expect(view.getByLabelText("目的関数:")).toBeDisabled();
		expect(view.getByLabelText("アニメーション速度:")).toHaveValue("1000");
		expect(generation()).toHaveTextContent(/^第1世代$/);
		setMobile(true);
		expect(settings).not.toHaveAttribute("open");
		expect(speed).toBeVisible();
		fireEvent.input(speed, { target: { value: "1950" } });
		expect(speed).toHaveAttribute("aria-valuetext", "0.05秒／世代");
		vi.advanceTimersByTime(49);
		expect(generation()).toHaveTextContent(/^第1世代$/);
		vi.advanceTimersByTime(1);
		expect(generation()).toHaveTextContent(/^第2世代$/);
		fireEvent.click(view.getByRole("button", { name: "一時停止" }));
		fireEvent.input(speed, { target: { value: "0" } });
		expect(speed).toHaveAttribute("aria-valuetext", "2秒／世代");
		vi.advanceTimersByTime(2000);
		expect(generation()).toHaveTextContent(/^第2世代$/);
		fireEvent.click(view.getByRole("button", { name: "再開" }));
		vi.advanceTimersByTime(1999);
		expect(generation()).toHaveTextContent(/^第2世代$/);
		vi.advanceTimersByTime(1);
		expect(generation()).toHaveTextContent(/^第3世代$/);

		view.unmount();
		expect(listeners.size).toBe(0);
	});
});
