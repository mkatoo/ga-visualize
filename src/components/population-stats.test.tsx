import { cleanup, render, within } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, test } from "vitest";
import { BestEverStats, PopulationStats } from "./population-stats";

describe("Population statistics fitness values", () => {
	afterEach(cleanup);

	test("updates the displayed best discovery and coordinates when the best improves", () => {
		const [best, setBest] = createSignal({ x: 1, y: 2, fitness: 5 });
		const [generation, setGeneration] = createSignal(0);
		const view = render(() => (
			<BestEverStats
				generation={generation()}
				bestIndividual={best()}
				bestGeneration={generation()}
			/>
		));
		expect(view.container.querySelector(".best-ever .value")).toHaveTextContent(
			"5.0000",
		);
		setBest({ x: 0.0000123456789, y: -0.5000123456789, fitness: 0.25 });
		setGeneration(1);
		expect(view.container.querySelector(".best-ever .value")).toHaveTextContent(
			"0.2500",
		);
		expect(view.getByText("x = 0.0000123456789")).toBeVisible();
		expect(view.getByText("y = -0.5000123456789")).toBeVisible();
		expect(view.getByText("第1世代で発見")).toBeVisible();
	});

	test("distinguishes the current generation from the best discovery", () => {
		const view = render(() => (
			<>
				<PopulationStats
					generation={8}
					averageFitness={20}
					bestIndividual={{ x: 0, y: 0, fitness: 14.203125 }}
				/>
				<BestEverStats
					generation={8}
					bestIndividual={{ x: 3, y: 0.5, fitness: 0 }}
					bestGeneration={4}
				/>
			</>
		));
		const bestEverCard = within(
			view.getByRole("region", { name: "第8世代までの最良評価値" }),
		);
		expect(
			bestEverCard.getByTitle("第8世代までの最良評価値: 0"),
		).toHaveTextContent("0.0000");
		expect(view.getByTitle("評価値: 14.203125")).toHaveTextContent("14.2031");
		expect(view.getByText(/第4世代で発見/)).toBeTruthy();
		expect(
			view.getByRole("region", { name: "第8世代の結果" }),
		).toHaveTextContent("最良評価値");
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
				<PopulationStats
					generation={7}
					bestIndividual={{ x: 1.23456, y: -2.34567, fitness }}
					averageFitness={fitness}
				/>
			));

			expect(getByTitle(`評価値: ${fitness}`)).toHaveTextContent(
				displayedValue,
			);
			expect(getByTitle(`平均評価値: ${fitness}`)).toHaveTextContent(
				displayedValue,
			);
			expect(getByTitle("座標: (1.23456, -2.34567)")).toHaveTextContent(
				"(1.235, -2.346)",
			);
		},
	);
});
