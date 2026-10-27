import { cleanup, renderHook } from "@solidjs/testing-library";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useGeneticAlgorithm } from "./use-genetic-algorithm";

const fields = [
	{
		name: "populationSize",
		change: "handlePopulationSizeChange",
		blur: "handlePopulationSizeBlur",
		newValue: 150,
	},
	{
		name: "generations",
		change: "handleGenerationsChange",
		blur: "handleGenerationsBlur",
		newValue: 60,
	},
] as const;

describe("Genetic algorithm parameter inputs", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	test.each(fields)(
		"preserves results while $name is empty and accepts a replacement value",
		({ name, change }) => {
			const { result } = renderHook(useGeneticAlgorithm);
			result.step();
			const statistics = result.statistics();
			const originalValue = result[name]();
			const input = document.createElement("input");
			input.type = "number";
			input.addEventListener("input", result[change]);

			input.value = "";
			input.dispatchEvent(new Event("input"));

			expect(result[name]()).toBe(originalValue);
			expect(result.statistics()).toBe(statistics);

			input.value = "25";
			input.dispatchEvent(new Event("input"));
			expect(result[name]()).toBe(25);
			expect(result.statistics().generation).toBe(0);
		},
	);

	test.each(fields)(
		"normalizes an empty $name on blur",
		({ name, change, blur }) => {
			const { result } = renderHook(useGeneticAlgorithm);
			const input = document.createElement("input");
			input.addEventListener("input", result[change]);
			input.addEventListener("blur", result[blur]);
			input.value = "";
			input.dispatchEvent(new Event("input"));
			input.dispatchEvent(new Event("blur"));
			expect(input.value).toBe("1");
			expect(result[name]()).toBe(1);
		},
	);

	test("stops on the final generation and does not restart a completed run", () => {
		vi.useFakeTimers();
		const { result } = renderHook(useGeneticAlgorithm);
		const input = document.createElement("input");
		input.addEventListener("input", result.handleGenerationsChange);
		input.value = "1";
		input.dispatchEvent(new Event("input"));

		result.start();
		vi.advanceTimersByTime(result.animationSpeed());

		expect(result.statistics().generation).toBe(1);
		expect(result.isRunning()).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
		const statistics = result.statistics();
		result.start();
		expect(result.isRunning()).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(result.animationSpeed());
		expect(result.statistics()).toBe(statistics);
	});

	test.each(fields)(
		"preserves results when an unchanged $name input loses focus",
		({ name, blur }) => {
			const { result } = renderHook(useGeneticAlgorithm);
			result.step();
			const statistics = result.statistics();
			const input = document.createElement("input");
			input.value = result[name]().toString();
			input.addEventListener("blur", result[blur]);

			input.dispatchEvent(new Event("blur"));

			expect(result.statistics().generation).toBe(1);
			expect(result.statistics()).toEqual(statistics);
		},
	);

	test.each(fields)(
		"applies a changed $name once and preserves its population on blur",
		({ name, change, blur, newValue }) => {
			const { result } = renderHook(useGeneticAlgorithm);
			result.step();
			const input = document.createElement("input");
			input.value = newValue.toString();
			input.addEventListener("input", result[change]);
			input.addEventListener("blur", result[blur]);

			input.dispatchEvent(new Event("input"));

			expect(result[name]()).toBe(newValue);
			expect(result.statistics().generation).toBe(0);
			expect(result.population()).toHaveLength(result.populationSize());
			const statistics = result.statistics();
			const individuals = result.population().slice(0, 2);

			input.dispatchEvent(new Event("blur"));

			expect(result.statistics()).toEqual(statistics);
			expect(result.population().slice(0, 2)).toEqual(individuals);
		},
	);
});
