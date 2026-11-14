import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GAApp } from "./ga-app";
import { GeneticAlgorithm } from "./genetic-algorithm";
import { mockCanvasContext } from "./test-support/visualization";

describe("GA application settings", () => {
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
});
