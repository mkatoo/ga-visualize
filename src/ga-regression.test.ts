import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { DEFAULT_CONFIG, GeneticAlgorithm } from "./genetic-algorithm";
import { type FunctionType, getObjectiveFunction } from "./objective-functions";

function seededRandom() {
	let state = 42;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

test("preserves seeded populations and statistics through initialization, evolution and reset", () => {
	const random = seededRandom();

	const runs = [];
	for (const functionType of [
		"sphere",
		"rosenbrock",
		"ackley",
		"rastrigin",
		"beale",
	] satisfies FunctionType[]) {
		for (const populationSize of [1, 5, 6]) {
			for (const mutationRate of [0, 0.1, 1]) {
				const ga = new GeneticAlgorithm(
					{
						...DEFAULT_CONFIG,
						functionType,
						bounds: getObjectiveFunction(functionType).bounds,
						populationSize,
						generations: 4,
						mutationRate,
						crossoverRate: mutationRate === 0 ? 0 : 0.8,
					},
					random,
				);
				ga.initializePopulation();
				for (let i = 0; i < 4; i++) ga.evolve();
				runs.push({
					snapshots: Array.from({ length: 5 }, (_, i) => ga.getSnapshot(i)),
					statistics: ga.getStatistics(),
				});
				ga.initializePopulation();
				runs.push(ga.getSnapshot(0));
			}
		}
	}
	const digest = createHash("sha256")
		.update(JSON.stringify(runs))
		.digest("hex");
	// Recorded from the implementation before extracting the genetic operators.
	expect(digest).toBe(
		"71658efb8278009df06574de2ae18abf669535f02ad01a538ae2d979e1ed0104",
	);
});
