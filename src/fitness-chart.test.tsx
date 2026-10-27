import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FitnessChart } from "./fitness-chart";

describe("FitnessChart scale", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
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
