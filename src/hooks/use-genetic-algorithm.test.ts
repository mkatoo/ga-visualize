import { cleanup, renderHook } from "@solidjs/testing-library";
import { afterEach, describe, expect, test } from "vitest";
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
	afterEach(cleanup);

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
