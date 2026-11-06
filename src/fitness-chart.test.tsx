import { cleanup, fireEvent, render, within } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FitnessChart } from "./fitness-chart";

describe("FitnessChart scale", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	test("updates visible legend values with the selected generation and incoming results", () => {
		const [selected, setSelected] = createSignal<number>();
		const [history, setHistory] = createSignal({
			best: [4, 2],
			average: [8, 6],
		});
		const view = render(() => (
			<FitnessChart
				bestFitness={history().best}
				averageFitness={history().average}
				totalGenerations={2}
				selectedGeneration={selected()}
			/>
		));
		const legend = within(view.getByRole("list", { name: "推移グラフの凡例" }));
		expect(legend.getByText("2.0000")).toBeVisible();
		expect(legend.getByText("6.0000")).toBeVisible();

		setSelected(0);
		expect(legend.getByText("4.0000")).toBeVisible();
		expect(legend.getByText("8.0000")).toBeVisible();
		fireEvent.click(view.getByRole("button", { name: "対数" }));
		expect(legend.getByText("4.0000")).toBeVisible();
		expect(legend.getByText("8.0000")).toBeVisible();

		setSelected(undefined);
		setHistory({ best: [4, 2, 0], average: [8, 6, 0.00000012] });
		expect(legend.getByText("0.0000")).toBeVisible();
		expect(legend.getByText("1.200e-7")).toBeVisible();
		expect(legend.getByText("1.200e-7")).toHaveAttribute("title", "1.2e-7");

		setHistory({ best: [3], average: [9] });
		expect(legend.getByText("3.0000")).toBeVisible();
		expect(legend.getByText("9.0000")).toBeVisible();
	});

	test("shows missing results as a dash in the legend", () => {
		const view = render(() => (
			<FitnessChart bestFitness={[]} averageFitness={[]} totalGenerations={2} />
		));
		const legend = within(view.getByRole("list", { name: "推移グラフの凡例" }));
		expect(legend.getAllByText("—")).toHaveLength(2);
	});

	test("uses a linear scale for small values while keeping zero finite", () => {
		const view = render(() => (
			<FitnessChart
				bestFitness={[100, 0.0001, 0]}
				averageFitness={[200, 0.0002, 0]}
				totalGenerations={2}
			/>
		));
		const middleY = Number(
			view.container
				.querySelector("polyline")
				?.getAttribute("points")
				?.split(" ")[1]
				.split(",")[1],
		);
		expect(middleY).toBeCloseTo(212 - (0.0001 / 200) * 190, 10);
		for (const line of view.container.querySelectorAll("polyline")) {
			expect(line.getAttribute("points")).not.toMatch(/NaN|Infinity/);
			expect(line.getAttribute("points")).toMatch(/620,212$/);
		}
	});

	test("separates orders of magnitude in log mode without selecting a generation", () => {
		const onSelect = vi.fn();
		const view = render(() => (
			<FitnessChart
				bestFitness={[100, 1, 0.01, 0]}
				averageFitness={[200, 2, 0.02, 0]}
				totalGenerations={3}
				selectedGeneration={2}
				onSelectGeneration={onSelect}
			/>
		));
		const original = view.container
			.querySelector("polyline")
			?.getAttribute("points");
		const linear = view.getByRole("button", { name: "線形" });
		const logarithmic = view.getByRole("button", { name: "対数" });
		expect(linear).toHaveAttribute("aria-pressed", "true");
		expect(logarithmic).toHaveAttribute("aria-pressed", "false");
		fireEvent.click(logarithmic);
		expect(linear).toHaveAttribute("aria-pressed", "false");
		expect(logarithmic).toHaveAttribute("aria-pressed", "true");
		expect(
			view.getByRole("group", { name: "縦軸" }),
		).toHaveAccessibleDescription(/縦軸は対数目盛です/);
		const points =
			view.container
				.querySelector("polyline")
				?.getAttribute("points")
				?.split(" ")
				.map((point) => Number(point.split(",")[1])) ?? [];
		expect(points).toHaveLength(4);
		expect(points[1] - points[0]).toBeCloseTo(points[2] - points[1]);
		expect(points[3]).toBe(212);
		expect(points[2]).toBeLessThan(200);
		expect(view.getByText("最良評価値: 0.01")).toBeInTheDocument();
		expect(onSelect).not.toHaveBeenCalled();
		const ticks = Array.from(
			view.container.querySelectorAll(".chart-y-ticks text"),
			(tick) => Number(tick.textContent),
		);
		expect(ticks[0]).toBe(0);
		expect(ticks.every(Number.isFinite)).toBe(true);
		fireEvent.click(linear);
		expect(linear).toHaveAttribute("aria-pressed", "true");
		expect(logarithmic).toHaveAttribute("aria-pressed", "false");
		expect(view.getByRole("group", { name: "縦軸" })).not.toHaveAttribute(
			"aria-describedby",
		);
		expect(view.container.querySelector("polyline")).toHaveAttribute(
			"points",
			original,
		);
	});

	test.each([0, Number.MIN_VALUE, 1e-200])(
		"keeps log coordinates finite for values near zero (%s)",
		(value) => {
			const view = render(() => (
				<FitnessChart
					bestFitness={[value, 0]}
					averageFitness={[value, 0]}
					totalGenerations={1}
				/>
			));
			fireEvent.click(view.getByRole("button", { name: "対数" }));
			for (const line of view.container.querySelectorAll("polyline")) {
				expect(line.getAttribute("points")).not.toMatch(/NaN|Infinity/);
				expect(line.getAttribute("points")).toMatch(/620,212$/);
			}
		},
	);

	test("keeps the full generation interval when selecting a generation", () => {
		const [selectedGeneration, setSelectedGeneration] = createSignal(50);
		const view = render(() => (
			<FitnessChart
				bestFitness={Array.from({ length: 51 }, (_, i) => 50 - i)}
				averageFitness={Array.from({ length: 51 }, (_, i) => 100 - i)}
				totalGenerations={100}
				selectedGeneration={selectedGeneration()}
			/>
		));
		const ticks = view.container.querySelectorAll(".chart-x-ticks text");
		expect(ticks[0]).toHaveTextContent(/^0$/);
		expect(ticks[ticks.length - 1]).toHaveTextContent(/^100$/);
		expect(
			view.container
				.querySelector("polyline")
				?.getAttribute("points")
				?.split(" "),
		).toHaveLength(51);
		setSelectedGeneration(35);
		expect(view.getByText("最良評価値: 15")).toBeInTheDocument();
		expect(view.getByText("平均評価値: 65")).toBeInTheDocument();
		expect(
			view.container.querySelector(".chart-x-ticks text"),
		).toHaveTextContent(/^0$/);
		expect(ticks[ticks.length - 1]).toHaveTextContent(/^100$/);
	});

	test("selects the nearest available generation when the chart is tapped", () => {
		vi.stubGlobal("PointerEvent", MouseEvent);
		const onSelect = vi.fn();
		const view = render(() => (
			<FitnessChart
				bestFitness={[4, 2, 1]}
				averageFitness={[8, 6, 4]}
				totalGenerations={2}
				onSelectGeneration={onSelect}
			/>
		));
		const chart = view.getByRole("img");
		vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 0,
			width: 640,
			height: 260,
		} as DOMRect);
		fireEvent.pointerDown(chart, { clientX: 446, clientY: 100 });
		expect(onSelect).not.toHaveBeenCalled();
		fireEvent.pointerUp(chart, { clientX: 446, clientY: 100 });
		expect(onSelect).toHaveBeenLastCalledWith(1);
		expect(view.getByText("最良評価値: 2")).toBeInTheDocument();
		expect(view.getByText("平均評価値: 6")).toBeInTheDocument();
	});

	test("ignores scrolling, canceled touches, secondary clicks and taps outside the plot", () => {
		vi.stubGlobal("PointerEvent", MouseEvent);
		const onSelect = vi.fn();
		const view = render(() => (
			<FitnessChart
				bestFitness={[4, 2, 1]}
				averageFitness={[8, 6, 4]}
				totalGenerations={2}
				onSelectGeneration={onSelect}
			/>
		));
		const chart = view.getByRole("img");
		vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({
			left: 0,
			top: 0,
			width: 640,
			height: 260,
		} as DOMRect);
		fireEvent.pointerDown(chart, { clientX: 346, clientY: 100 });
		fireEvent.pointerMove(chart, { clientX: 346, clientY: 130 });
		fireEvent.pointerUp(chart, { clientX: 346, clientY: 100 });
		fireEvent.pointerDown(chart, { clientX: 346, clientY: 100 });
		fireEvent.pointerCancel(chart);
		fireEvent.pointerUp(chart, { clientX: 346, clientY: 100 });
		fireEvent.pointerDown(chart, { clientX: 346, clientY: 100, button: 2 });
		fireEvent.pointerUp(chart, { clientX: 346, clientY: 100, button: 2 });
		for (const [clientX, clientY] of [
			[30, 100],
			[630, 100],
			[346, 10],
			[346, 240],
		]) {
			fireEvent.pointerDown(chart, { clientX, clientY });
			fireEvent.pointerUp(chart, { clientX, clientY });
		}
		expect(onSelect).not.toHaveBeenCalled();
	});

	test("draws both zero-fitness series along the bottom axis", () => {
		const { container } = render(() => (
			<FitnessChart
				bestFitness={[0, 0]}
				averageFitness={[0, 0]}
				totalGenerations={1}
			/>
		));

		const points = Array.from(container.querySelectorAll("polyline"), (line) =>
			line.getAttribute("points"),
		);
		expect(points).toEqual(["72,212 620,212", "72,212 620,212"]);
	});

	test("updates the scale between zero fitness and small positive fitness", () => {
		const [history, setHistory] = createSignal({
			bestFitness: [0, 0],
			averageFitness: [0, 0],
		});
		const { container } = render(() => (
			<FitnessChart
				bestFitness={history().bestFitness}
				averageFitness={history().averageFitness}
				totalGenerations={1}
			/>
		));
		const points = () =>
			Array.from(container.querySelectorAll("polyline"), (line) =>
				line.getAttribute("points"),
			);

		setHistory({ bestFitness: [1e-9, 0], averageFitness: [4e-9, 2e-9] });

		expect(points()).toEqual(["72,164.5 620,212", "72,22 620,117"]);

		setHistory({ bestFitness: [0, 0], averageFitness: [0, 0] });

		expect(points()).toEqual(["72,212 620,212", "72,212 620,212"]);
	});

	test.each([4e-9, 4e8])(
		"shows distinct, readable fitness ticks for a maximum of %s",
		(maximum) => {
			const { container } = render(() => (
				<FitnessChart
					bestFitness={[maximum / 2, 0]}
					averageFitness={[maximum, maximum / 2]}
					totalGenerations={1}
				/>
			));
			const ticks = Array.from(
				container.querySelectorAll(".chart-y-ticks text"),
				(label) => Number(label.textContent),
			);

			expect(ticks).toHaveLength(5);
			ticks.forEach((value, i) => {
				expect(value / maximum).toBeCloseTo(i / 4, 12);
			});
		},
	);

	test("shows generation zero as points before the first evolution", () => {
		const { container } = render(() => (
			<FitnessChart
				bestFitness={[2]}
				averageFitness={[8]}
				totalGenerations={50}
			/>
		));

		expect(container.querySelectorAll("polyline")).toHaveLength(0);
		expect(
			Array.from(container.querySelectorAll("circle"), (point) => [
				Number(point.getAttribute("cx")),
				Number(point.getAttribute("cy")),
			]),
		).toEqual([
			[72, 164.5],
			[72, 22],
		]);
	});

	test.each([1, 3, 50, 1000])(
		"labels integer generations from zero to the configured %s generations",
		(totalGenerations) => {
			const { container } = render(() => (
				<FitnessChart
					bestFitness={[1]}
					averageFitness={[2]}
					totalGenerations={totalGenerations}
				/>
			));
			const ticks = Array.from(
				container.querySelectorAll(".chart-x-ticks text"),
				(label) => Number(label.textContent),
			);

			expect(ticks[0]).toBe(0);
			expect(ticks.at(-1)).toBe(totalGenerations);
			expect(ticks.every(Number.isInteger)).toBe(true);
			expect(new Set(ticks).size).toBe(ticks.length);
		},
	);

	test("resizes the plot and tick density while preserving its vertical scale", () => {
		let resize!: ResizeObserverCallback;
		const observe = vi.fn();
		const disconnect = vi.fn();
		vi.stubGlobal(
			"ResizeObserver",
			class {
				constructor(callback: ResizeObserverCallback) {
					resize = callback;
				}
				observe = observe;
				disconnect = disconnect;
			},
		);
		const { container, unmount } = render(() => (
			<FitnessChart
				bestFitness={Array.from({ length: 51 }, (_, i) => 50 - i)}
				averageFitness={Array.from({ length: 51 }, (_, i) => 100 - i)}
				totalGenerations={50}
			/>
		));
		const chart = container.querySelector("svg");
		const updateWidth = (width: number) =>
			resize(
				[{ contentRect: { width } }] as ResizeObserverEntry[],
				{} as ResizeObserver,
			);
		const xTicks = () => container.querySelectorAll(".chart-x-ticks text");
		const yTicks = () =>
			Array.from(
				container.querySelectorAll(".chart-y-ticks text"),
				(label) => label.textContent,
			);
		const originalYTicks = yTicks();

		expect(observe).toHaveBeenCalledWith(
			container.querySelector(".chart-container"),
		);
		updateWidth(240);
		expect(chart).toHaveAttribute("viewBox", "0 0 240 260");
		expect(xTicks()).toHaveLength(2);
		expect(container.querySelector("circle")).toHaveAttribute("cx", "220");
		expect(yTicks()).toEqual(originalYTicks);

		updateWidth(960);
		expect(chart).toHaveAttribute("viewBox", "0 0 960 260");
		expect(xTicks().length).toBeGreaterThan(2);
		expect(container.querySelector("circle")).toHaveAttribute("cx", "940");
		expect(yTicks()).toEqual(originalYTicks);

		updateWidth(0);
		expect(chart).toHaveAttribute("viewBox", "0 0 960 260");
		unmount();
		expect(disconnect).toHaveBeenCalledOnce();
	});
});
