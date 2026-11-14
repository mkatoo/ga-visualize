import { cleanup, fireEvent, render, within } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GAApp } from "./ga-app";
import { OBJECTIVE_FUNCTIONS } from "./objective-functions";
import {
	displayedGeneration,
	mockCanvasContext,
} from "./test-support/visualization";

describe("GA application playback, history and layout", () => {
	beforeEach(() => {
		mockCanvasContext();
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.clearAllMocks();
		vi.unstubAllGlobals();
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
