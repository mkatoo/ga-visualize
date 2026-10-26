import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, test } from "vitest";
import { FitnessChart } from "./fitness-chart";

describe("FitnessChart scale", () => {
	afterEach(cleanup);

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
		expect(points).toEqual(["30,170 280,170", "30,170 280,170"]);
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

		expect(points()).toEqual(["30,132.5 280,170", "30,20 280,95"]);

		setHistory({ bestFitness: [0, 0], averageFitness: [0, 0] });

		expect(points()).toEqual(["30,170 280,170", "30,170 280,170"]);
	});
});
