import type { GAConfig, Individual } from "./genetic-algorithm";

export type RandomSource = () => number;

export function tournamentSelection(
	population: Individual[],
	tournamentSize: number,
	random: RandomSource,
): Individual {
	if (population.length === 0) {
		throw new Error(
			"Population is empty - cannot perform tournament selection",
		);
	}

	let best = population[Math.floor(random() * population.length)];

	for (let i = 1; i < tournamentSize; i++) {
		const candidate = population[Math.floor(random() * population.length)];
		if (candidate && candidate.fitness < best.fitness) {
			best = candidate;
		}
	}

	return { ...best };
}

export function blxAlphaCrossover(
	parent1: Individual,
	parent2: Individual,
	bounds: GAConfig["bounds"],
	random: RandomSource,
	alpha = 0.5,
): [Individual, Individual] {
	const dx = Math.abs(parent1.x - parent2.x);
	const dy = Math.abs(parent1.y - parent2.y);

	const minX = Math.min(parent1.x, parent2.x) - alpha * dx;
	const maxX = Math.max(parent1.x, parent2.x) + alpha * dx;
	const minY = Math.min(parent1.y, parent2.y) - alpha * dy;
	const maxY = Math.max(parent1.y, parent2.y) + alpha * dy;

	const child1: Individual = {
		x: random() * (maxX - minX) + minX,
		y: random() * (maxY - minY) + minY,
		fitness: 0,
	};

	const child2: Individual = {
		x: random() * (maxX - minX) + minX,
		y: random() * (maxY - minY) + minY,
		fitness: 0,
	};

	child1.x = clampToBounds(child1.x, bounds);
	child1.y = clampToBounds(child1.y, bounds);
	child2.x = clampToBounds(child2.x, bounds);
	child2.y = clampToBounds(child2.y, bounds);

	return [child1, child2];
}

export function gaussianMutation(
	individual: Individual,
	bounds: GAConfig["bounds"],
	mutationRate: number,
	random: RandomSource,
): Individual {
	const mutated = { ...individual };

	if (random() < mutationRate) {
		const sigma = (bounds.max - bounds.min) * 0.1;
		mutated.x += gaussianRandom(random) * sigma;
		mutated.y += gaussianRandom(random) * sigma;

		mutated.x = clampToBounds(mutated.x, bounds);
		mutated.y = clampToBounds(mutated.y, bounds);
	}

	return mutated;
}

function clampToBounds(value: number, bounds: GAConfig["bounds"]): number {
	const { min, max } = bounds;
	return Math.max(min, Math.min(max, value));
}

export function gaussianRandom(random: RandomSource): number {
	let u = 0,
		v = 0;
	while (u === 0) u = random();
	while (v === 0) v = random();
	return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
