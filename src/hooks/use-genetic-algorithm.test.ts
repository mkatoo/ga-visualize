import { cleanup, renderHook } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useGeneticAlgorithm } from "./use-genetic-algorithm";

const fields = [
	{
		name: "populationSize",
		change: "handlePopulationSizeChange",
		blur: "handlePopulationSizeBlur",
		value: "150",
	},
	{
		name: "generations",
		change: "handleGenerationsChange",
		blur: "handleGenerationsBlur",
		value: "60",
	},
] as const;

function input(handler: (event: Event) => void, value: string) {
	const element = document.createElement("input");
	element.value = value;
	element.addEventListener("input", handler);
	element.dispatchEvent(new Event("input"));
	return element;
}

describe("Genetic algorithm settings", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	test.each(fields)(
		"uses $name changes directly before the first run",
		({ name, change, value }) => {
			const { result } = renderHook(useGeneticAlgorithm);
			input(result[change], value);
			expect(result[name]()).toBe(Number(value));
			expect(result.settingsLocked()).toBe(false);
			expect(result.statistics().generation).toBe(0);
			result.start();
			expect(result.settingsLocked()).toBe(true);
			expect(result.isRunning()).toBe(true);
		},
	);

	test.each(fields)(
		"restores an empty $name on blur without recreating the population",
		({ name, change, blur }) => {
			const { result } = renderHook(useGeneticAlgorithm);
			const statistics = result.statistics();
			const original = result[name]();
			const element = input(result[change], "");
			element.addEventListener("blur", result[blur]);
			element.dispatchEvent(new Event("blur"));
			expect(element.value).toBe(String(original));
			expect(result.statistics()).toBe(statistics);
		},
	);

	test.each(fields)(
		"locks $name through running, paused and completed states until reset",
		({ name, change, value }) => {
			const { result } = renderHook(useGeneticAlgorithm);
			const original = result[name]();
			result.start();
			input(result[change], value);
			expect(result[name]()).toBe(original);
			result.stop();
			const paused = result.statistics();
			input(result[change], value);
			expect(result[name]()).toBe(original);
			expect(result.statistics()).toBe(paused);
			result.start();
			vi.advanceTimersByTime(result.animationSpeed() * result.generations());
			expect(result.runStatus()).toBe("completed");
			const completed = result.statistics();
			input(result[change], value);
			expect(result[name]()).toBe(original);
			expect(result.statistics()).toBe(completed);
			result.reset();
			expect(result.settingsLocked()).toBe(false);
			input(result[change], value);
			expect(result[name]()).toBe(Number(value));
		},
	);

	test("locks the objective function after a single step and permits changes after reset", () => {
		const { result } = renderHook(useGeneticAlgorithm);
		input(result.handleFunctionTypeChange, "beale");
		expect(result.ga().getBounds()).toEqual({ min: -4.5, max: 4.5 });
		result.step();
		const statistics = result.statistics();
		input(result.handleFunctionTypeChange, "sphere");
		expect(result.functionType()).toBe("beale");
		expect(result.statistics()).toBe(statistics);
		result.reset();
		input(result.handleFunctionTypeChange, "sphere");
		expect(result.functionType()).toBe("sphere");
		expect(result.ga().getBounds()).toEqual({ min: -10, max: 10 });
	});

	test("pauses to inspect history and resumes from the latest population", () => {
		const { result } = renderHook(useGeneticAlgorithm);
		result.start();
		vi.advanceTimersByTime(500);
		const generationOne = result.population();
		vi.advanceTimersByTime(1000);
		const latest = result.population();
		result.selectGeneration(1);
		expect(result.isRunning()).toBe(false);
		expect(result.statistics().generation).toBe(3);
		expect(result.displayedSnapshot().population).toEqual(generationOne);
		expect(result.population()).toBe(latest);
		expect(result.isViewingHistory()).toBe(true);
		vi.advanceTimersByTime(1000);
		expect(result.statistics().generation).toBe(3);
		result.start();
		expect(result.displayedGeneration()).toBe(3);
		vi.advanceTimersByTime(500);
		expect(result.displayedGeneration()).toBe(4);
		result.selectGeneration(1);
		result.reset();
		expect(result.displayedGeneration()).toBe(0);
		expect(result.ga().getSnapshot(1)).toBeUndefined();
	});
});
