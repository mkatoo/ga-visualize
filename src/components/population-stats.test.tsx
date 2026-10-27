import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, test } from "vitest";
import { PopulationStats } from "./population-stats";

describe("Population statistics fitness values", () => {
	afterEach(cleanup);

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

			expect(getByTitle(`適応度: ${fitness}`)).toHaveTextContent(
				displayedValue,
			);
			expect(getByTitle(`平均適応度: ${fitness}`)).toHaveTextContent(
				displayedValue,
			);
			expect(getByTitle("座標: (1.23456, -2.34567)")).toHaveTextContent(
				"(1.235, -2.346)",
			);
		},
	);
});
