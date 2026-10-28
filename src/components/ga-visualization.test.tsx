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
		expect(view.getByTitle("評価値: 5")).toBeTruthy();
	});

	test("keeps the GA running and its current population when switching views", async () => {
		const view = render(() => <GAApp />);
		await open3D(view);
		const population = renderer.updatePopulation.mock.lastCall?.[0];
		vi.useFakeTimers();
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		vi.advanceTimersByTime(500);
		expect(
			view.container.querySelector(".generation-stat .value"),
		).toHaveTextContent("1");
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
		expect(
			view.container.querySelector(".generation-stat .value"),
		).toHaveTextContent("2");
	});

	test("pauses, resumes, steps, and resets using the unified playback controls", () => {
		const view = render(() => <GAApp />);
		const generation = () =>
			view.container.querySelector(".generation-stat .value");
		const stepButton = view.getByRole("button", { name: "1世代進める" });
		vi.useFakeTimers();

		fireEvent.click(view.getByRole("button", { name: "開始" }));
		expect(stepButton).toBeDisabled();
		expect(view.getByLabelText("目的関数:")).toBeDisabled();
		vi.advanceTimersByTime(500);
		expect(generation()).toHaveTextContent(/^1$/);
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
		expect(generation()).toHaveTextContent(/^1$/);

		fireEvent.click(stepButton);
		expect(generation()).toHaveTextContent(/^2$/);
		vi.advanceTimersByTime(1000);
		expect(generation()).toHaveTextContent(/^2$/);

		fireEvent.click(view.getByRole("button", { name: "再開" }));
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

	test("synchronizes history with the 3D population, statistics and chart", async () => {
		const view = render(() => <GAApp />);
		await open3D(view);
		vi.useFakeTimers();
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		vi.advanceTimersByTime(500);
		const generationOne = renderer.updatePopulation.mock.lastCall?.[0];
		vi.advanceTimersByTime(1000);
		fireEvent.input(view.getByLabelText(/表示する世代:/), {
			target: { value: "1" },
		});
		expect(view.getByRole("button", { name: "最新から再開" })).toBeEnabled();
		expect(renderer.updatePopulation.mock.lastCall?.[0]).toEqual(generationOne);
		expect(
			view.container.querySelector(".generation-stat .value"),
		).toHaveTextContent(/^1$/);
		expect(view.getByLabelText("確認する世代")).toHaveValue(1);
		expect(
			view.getByRole("region", { name: "選択した世代の評価値" }),
		).toHaveTextContent("第1世代");
		fireEvent.input(view.getByLabelText("確認する世代"), {
			target: { value: "2" },
		});
		expect(view.getByLabelText(/表示する世代:/)).toHaveValue("2");
		expect(
			view.container.querySelector(".generation-stat .value"),
		).toHaveTextContent(/^2$/);
		fireEvent.click(view.getByRole("button", { name: "最新世代に戻る" }));
		expect(view.getByLabelText(/表示する世代:/)).toHaveValue("3");
		fireEvent.click(view.getByRole("button", { name: "再開" }));
		vi.advanceTimersByTime(500);
		expect(
			view.container.querySelector(".generation-stat .value"),
		).toHaveTextContent(/^4$/);
	});

	test("shows completion and offers a new run instead of inactive playback", () => {
		vi.useFakeTimers();
		const view = render(() => <GAApp />);
		fireEvent.input(view.getByLabelText("世代数 (1-1000):"), {
			target: { value: "1" },
		});
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
		expect(
			view.container.querySelector(".generation-stat .value"),
		).toHaveTextContent(/^0$/);
		vi.advanceTimersByTime(500);
		expect(view.getByRole("status")).toHaveTextContent("実行が完了しました");
	});

	test("requires reset to change settings after starting or completing a run", () => {
		vi.useFakeTimers();
		const view = render(() => <GAApp />);
		const generations = view.getByLabelText("世代数 (1-1000):");
		fireEvent.input(generations, { target: { value: "1" } });
		expect(view.queryByText(/適用して/)).toBeNull();
		fireEvent.click(view.getByRole("button", { name: "開始" }));
		fireEvent.click(view.getByRole("button", { name: "一時停止" }));
		expect(generations).toBeDisabled();
		expect(view.getByLabelText("個体数 (1-1000):")).toBeDisabled();
		expect(view.getByLabelText("目的関数:")).toBeDisabled();
		expect(
			view.getByText("設定を変更するにはリセットしてください。"),
		).toBeTruthy();
		fireEvent.click(view.getByRole("button", { name: "再開" }));
		vi.advanceTimersByTime(500);
		expect(generations).toBeDisabled();
		fireEvent.click(view.getByRole("button", { name: "リセット" }));
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
		const generation = () =>
			view.container.querySelector(".generation-stat .value");
		expect(settings).not.toHaveAttribute("open");
		if (!summary) throw new Error("Settings summary is missing");
		fireEvent.click(summary);
		expect(settings).toHaveAttribute("open");
		fireEvent.input(view.getByLabelText("個体数 (1-1000):"), {
			target: { value: "150" },
		});
		fireEvent.input(view.getByLabelText("世代数 (1-1000):"), {
			target: { value: "75" },
		});
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
		expect(generation()).toHaveTextContent(/^1$/);
		setMobile(false);
		expect(settings).toHaveAttribute("open");
		expect(view.getByLabelText("個体数 (1-1000):")).toHaveValue(150);
		expect(view.getByLabelText("世代数 (1-1000):")).toHaveValue(75);
		expect(view.getByLabelText("目的関数:")).toHaveValue("ackley");
		expect(view.getByLabelText("目的関数:")).toBeDisabled();
		expect(view.getByLabelText("アニメーション速度:")).toHaveValue("1000");
		expect(generation()).toHaveTextContent(/^1$/);
		setMobile(true);
		expect(settings).not.toHaveAttribute("open");
		vi.advanceTimersByTime(1000);
		expect(generation()).toHaveTextContent(/^2$/);
		fireEvent.click(view.getByRole("button", { name: "一時停止" }));
		vi.advanceTimersByTime(1000);
		expect(generation()).toHaveTextContent(/^2$/);

		view.unmount();
		expect(listeners.size).toBe(0);
	});
});
