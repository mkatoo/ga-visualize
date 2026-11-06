import { cleanup, fireEvent, render, within } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, test } from "vitest";
import { GenerationSummary, ResultDetails } from "./population-stats";

describe("Population statistics fitness values", () => {
	afterEach(cleanup);

	test("updates the displayed best discovery and coordinates when the best improves", () => {
		const [best, setBest] = createSignal({ x: 1, y: 2, fitness: 5 });
		const [generation, setGeneration] = createSignal(0);
		const view = render(() => (
			<ResultDetails
				generation={generation()}
				bestIndividual={null}
				bestEver={best()}
				bestEverGeneration={generation()}
			/>
		));
		expect(view.getByText("(1.000, 2.000)")).not.toBeVisible();
		setBest({ x: 0.0000123456789, y: -0.5000123456789, fitness: 0.25 });
		setGeneration(1);
		expect(view.getByText("(0.000, -0.500)")).not.toBeVisible();
		fireEvent.click(view.getByText("結果の詳細"));
		expect(view.getByText("(0.000, -0.500)")).toBeVisible();
		expect(view.getByText("0.0000123456789")).not.toBeVisible();
		expect(view.getByText("-0.5000123456789")).not.toBeVisible();
		fireEvent.click(view.getByText("座標の詳細"));
		expect(view.getByText("0.0000123456789")).toBeVisible();
		expect(view.getByText("-0.5000123456789")).toBeVisible();
		expect(view.getByText("第1世代で発見")).toBeVisible();
		setBest({ x: 0.000003456789, y: -0.12503456789, fitness: 0.015625 });
		setGeneration(2);
		expect(view.getByText("(0.000, -0.125)")).toBeVisible();
		expect(view.getByText("0.000003456789")).toBeVisible();
		expect(view.getByText("-0.12503456789")).toBeVisible();
		expect(view.getByText("第2世代で発見")).toBeVisible();
	});

	test("distinguishes the current generation from the best discovery", () => {
		const view = render(() => (
			<ResultDetails
				generation={8}
				bestIndividual={{ x: 0, y: 0, fitness: 14.203125 }}
				bestEver={{ x: 3, y: 0.5, fitness: 0 }}
				bestEverGeneration={4}
			/>
		));
		fireEvent.click(view.getByText("結果の詳細"));
		const bestEverCard = within(
			view.getByRole("region", { name: "第8世代までの最良個体" }),
		);
		expect(bestEverCard.getByText("(3.000, 0.500)")).toBeVisible();
		expect(bestEverCard.getByText("第4世代で発見")).toBeVisible();
		expect(
			within(view.getByRole("region", { name: "第8世代の最良個体" })).getByText(
				"(0.000, 0.000)",
			),
		).toBeVisible();
		expect(view.queryByText("14.2031")).toBeNull();
		fireEvent.click(view.getByText("結果の詳細"));
		expect(bestEverCard.getByText("(3.000, 0.500)")).not.toBeVisible();
	});

	test.each([
		[0, "0.0000"],
		[2.34567, "2.3457"],
		[1e-9, "1.000e-9"],
		[1e8, "1.000e+8"],
	] as const)(
		"displays %s without hiding small values or expanding large values",
		(fitness, displayedValue) => {
			const { getByTitle } = render(() => (
				<GenerationSummary
					generation={7}
					bestIndividual={{ x: 1.23456, y: -2.34567, fitness }}
					averageFitness={fitness}
					bestEver={{ x: 1.23456, y: -2.34567, fitness }}
				/>
			));

			expect(getByTitle(`評価値: ${fitness}`)).toHaveTextContent(
				displayedValue,
			);
			expect(getByTitle(`平均評価値: ${fitness}`)).toHaveTextContent(
				displayedValue,
			);
			expect(getByTitle(`これまでの最良評価値: ${fitness}`)).toHaveTextContent(
				displayedValue,
			);
		},
	);
});
