import { cleanup, fireEvent, render, within } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GAApp } from "./ga-app";
import {
	createRendererMock,
	mock3DVisualizer,
	open3D,
} from "./test-support/three-visualizer";
import {
	displayedGeneration,
	mockCanvasContext,
} from "./test-support/visualization";

vi.mock("./three-landscape-renderer", () => ({
	ThreeLandscapeRenderer: vi.fn(),
}));

describe("GA application visualization integration", () => {
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
});
