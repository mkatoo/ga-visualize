import { beforeEach, describe, expect, test } from "vitest";
import {
	blxAlphaCrossover,
	gaussianMutation,
	gaussianRandom,
	tournamentSelection,
} from "./ga-operators";
import {
	DEFAULT_CONFIG,
	type GAConfig,
	GeneticAlgorithm,
	type Individual,
} from "./genetic-algorithm";
import { getObjectiveFunction } from "./objective-functions";

describe("GeneticAlgorithm", () => {
	let ga: GeneticAlgorithm;
	let random: () => number;

	beforeEach(() => {
		let randomState = 42;
		random = () => {
			randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
			return randomState / 2 ** 32;
		};
		ga = new GeneticAlgorithm(
			{
				...DEFAULT_CONFIG,
				bounds: { ...DEFAULT_CONFIG.bounds },
			},
			random,
		);
	});

	describe("Objective Function Integration", () => {
		test("should use objective functions correctly", () => {
			const sphereFunction = getObjectiveFunction("sphere").fn;

			expect(sphereFunction(0, 0)).toBe(0);
			expect(sphereFunction(1, 1)).toBe(2);
			expect(sphereFunction(3, 4)).toBe(25);
			expect(sphereFunction(-2, -3)).toBe(13);
			expect(sphereFunction(0.5, 0.5)).toBe(0.5);
		});
	});

	describe("Individual Creation", () => {
		test("should create individuals within bounds", () => {
			const config: GAConfig = {
				...DEFAULT_CONFIG,
				bounds: { min: -10, max: 10 },
			};
			const gaWithBounds = new GeneticAlgorithm(config, random);
			gaWithBounds.initializePopulation();

			for (const individual of gaWithBounds.getPopulation()) {
				expect(individual.x).toBeGreaterThanOrEqual(-10);
				expect(individual.x).toBeLessThanOrEqual(10);
				expect(individual.y).toBeGreaterThanOrEqual(-10);
				expect(individual.y).toBeLessThanOrEqual(10);
				expect(individual.fitness).toBe(
					individual.x * individual.x + individual.y * individual.y,
				);
			}
		});

		test("should create individuals with correct fitness", () => {
			ga.initializePopulation();
			const individual = ga.getPopulation()[0];
			const expectedFitness =
				individual.x * individual.x + individual.y * individual.y;
			expect(individual.fitness).toBe(expectedFitness);
		});
	});

	describe("Gaussian Random", () => {
		test("should generate numbers with approximately normal distribution", () => {
			const samples: number[] = [];
			for (let i = 0; i < 1000; i++) {
				samples.push(gaussianRandom(random));
			}

			const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
			const variance =
				samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / samples.length;

			// For standard normal distribution, mean ≈ 0, variance ≈ 1
			expect(Math.abs(mean)).toBeLessThan(0.1);
			expect(Math.abs(variance - 1)).toBeLessThan(0.2);
		});
	});

	describe("Tournament Selection", () => {
		test("should select better individual from tournament", () => {
			// Create population with known fitness values
			const population: Individual[] = [
				{ x: 0, y: 0, fitness: 0 }, // best
				{ x: 1, y: 1, fitness: 2 }, // second best
				{ x: 2, y: 2, fitness: 8 }, // worst
			];

			// Run tournament selection multiple times and check it tends to select better individuals
			const results: number[] = [];
			for (let i = 0; i < 100; i++) {
				const selected = tournamentSelection(population, 2, random);
				results.push(selected.fitness);
			}

			// The average fitness of selected individuals should be better than random selection
			const averageSelected =
				results.reduce((sum, f) => sum + f, 0) / results.length;
			const averagePopulation =
				population.reduce((sum, ind) => sum + ind.fitness, 0) /
				population.length;

			expect(averageSelected).toBeLessThan(averagePopulation);
		});
	});

	describe("BLX-Alpha Crossover", () => {
		test("should produce children within expected range", () => {
			const parent1: Individual = { x: 0, y: 0, fitness: 0 };
			const parent2: Individual = { x: 4, y: 4, fitness: 32 };
			const alpha = 0.5;
			const [child1, child2] = blxAlphaCrossover(
				parent1,
				parent2,
				DEFAULT_CONFIG.bounds,
				random,
				alpha,
			);

			// Children should be within extended range [-2, 6] for both x and y
			expect(child1.x).toBeGreaterThanOrEqual(-2);
			expect(child1.x).toBeLessThanOrEqual(6);
			expect(child1.y).toBeGreaterThanOrEqual(-2);
			expect(child1.y).toBeLessThanOrEqual(6);

			expect(child2.x).toBeGreaterThanOrEqual(-2);
			expect(child2.x).toBeLessThanOrEqual(6);
			expect(child2.y).toBeGreaterThanOrEqual(-2);
			expect(child2.y).toBeLessThanOrEqual(6);
		});

		test("should respect bounds constraint", () => {
			const config: GAConfig = {
				...DEFAULT_CONFIG,
				bounds: { min: -5, max: 5 },
			};

			const parent1: Individual = { x: -4, y: -4, fitness: 32 };
			const parent2: Individual = { x: 4, y: 4, fitness: 32 };
			const [child1, child2] = blxAlphaCrossover(
				parent1,
				parent2,
				config.bounds,
				random,
			);

			expect(child1.x).toBeGreaterThanOrEqual(-5);
			expect(child1.x).toBeLessThanOrEqual(5);
			expect(child1.y).toBeGreaterThanOrEqual(-5);
			expect(child1.y).toBeLessThanOrEqual(5);

			expect(child2.x).toBeGreaterThanOrEqual(-5);
			expect(child2.x).toBeLessThanOrEqual(5);
			expect(child2.y).toBeGreaterThanOrEqual(-5);
			expect(child2.y).toBeLessThanOrEqual(5);
		});
	});

	describe("Gaussian Mutation", () => {
		test("should only mutate when random < mutation rate", () => {
			const config: GAConfig = {
				...DEFAULT_CONFIG,
				mutationRate: 0,
			};

			const individual: Individual = { x: 1, y: 2, fitness: 5 };
			const mutated = gaussianMutation(
				individual,
				config.bounds,
				config.mutationRate,
				random,
			);

			expect(mutated.x).toBe(individual.x);
			expect(mutated.y).toBe(individual.y);
		});

		test("should respect bounds after mutation", () => {
			const config: GAConfig = {
				...DEFAULT_CONFIG,
				mutationRate: 1.0, // Always mutate
				bounds: { min: -10, max: 10 },
			};

			for (let i = 0; i < 50; i++) {
				const individual: Individual = { x: 9, y: 9, fitness: 162 };
				const mutated = gaussianMutation(
					individual,
					config.bounds,
					config.mutationRate,
					random,
				);

				expect(mutated.x).toBeGreaterThanOrEqual(-10);
				expect(mutated.x).toBeLessThanOrEqual(10);
				expect(mutated.y).toBeGreaterThanOrEqual(-10);
				expect(mutated.y).toBeLessThanOrEqual(10);
			}
		});
	});

	describe("Population Management", () => {
		test("should initialize population with correct size", () => {
			ga.initializePopulation();
			const population = ga.getPopulation();

			expect(population).toHaveLength(DEFAULT_CONFIG.populationSize);
			expect(ga.getGeneration()).toBe(0);
		});

		test("should evaluate all individuals during initialization", () => {
			ga.initializePopulation();
			const population = ga.getPopulation();

			population.forEach((individual) => {
				const expectedFitness =
					individual.x * individual.x + individual.y * individual.y;
				expect(individual.fitness).toBe(expectedFitness);
			});
		});
	});

	describe("Best Individual Finding", () => {
		test("should return null for empty population", () => {
			expect(ga.getBestIndividual()).toBeNull();
		});

		test("should find individual with minimum fitness", () => {
			ga.initializePopulation();
			const population = ga.getPopulation();
			const best = ga.getBestIndividual();
			expect(best).not.toBeNull();
			expect(best?.fitness).toBe(
				Math.min(...population.map((individual) => individual.fitness)),
			);
			expect(population).toContain(best);
		});
	});

	describe("Statistics", () => {
		test("preserves independent snapshots and clears the previous run on reset", () => {
			ga.initializePopulation();
			const initial = ga.getSnapshot(0);
			ga.evolve();
			ga.evolve();
			expect(ga.getSnapshot(0)).toEqual(initial);
			const first = ga.getSnapshot(1);
			expect(first?.generation).toBe(1);
			expect(first?.population).toContain(first?.currentBest);
			if (first) first.population[0].x = 999;
			expect(ga.getSnapshot(1)?.population[0].x).not.toBe(999);
			ga.initializePopulation();
			expect(ga.getSnapshot(1)).toBeUndefined();
			expect(ga.getSnapshot(0)?.generation).toBe(0);
		});

		test("retains the best discovery when a later generation worsens and clears it on reset", () => {
			let value = 0.5;
			const run = new GeneticAlgorithm(
				{
					...DEFAULT_CONFIG,
					populationSize: 1,
					crossoverRate: 0,
					mutationRate: 1,
				},
				() => value,
			);
			run.initializePopulation();
			const initial = run.getStatistics().currentBest;
			expect(initial?.fitness).toBe(0);
			run.evolve();
			expect(run.getStatistics().currentBest?.fitness).toBeGreaterThan(0);
			expect(run.getStatistics().bestEver).toEqual(initial);
			expect(run.getStatistics().bestEverGeneration).toBe(0);
			value = 0.6;
			run.initializePopulation();
			expect(run.getStatistics().bestEver).toEqual(
				run.getStatistics().currentBest,
			);
			expect(run.getStatistics().bestEver?.fitness).toBeGreaterThan(0);
		});

		test("should track generation statistics correctly", () => {
			ga.initializePopulation();
			const initialStats = ga.getStatistics();

			expect(initialStats.generation).toBe(0);
			expect(initialStats.bestFitness).toHaveLength(1);
			expect(initialStats.averageFitness).toHaveLength(1);
			expect(initialStats.currentBest).not.toBeNull();
		});

		test("should update statistics after evolution", () => {
			ga.initializePopulation();
			const canEvolve = ga.evolve();

			expect(canEvolve).toBe(true);
			expect(ga.getGeneration()).toBe(1);

			const stats = ga.getStatistics();
			expect(stats.generation).toBe(1);
			expect(stats.bestFitness).toHaveLength(2);
			expect(stats.averageFitness).toHaveLength(2);
		});
	});

	describe("Evolution Process", () => {
		test("should evolve until max generations reached", () => {
			const config: GAConfig = {
				...DEFAULT_CONFIG,
				generations: 3,
			};
			const gaShort = new GeneticAlgorithm(config);
			gaShort.initializePopulation();

			expect(gaShort.evolve()).toBe(true); // Gen 1
			expect(gaShort.evolve()).toBe(true); // Gen 2
			expect(gaShort.evolve()).toBe(true); // Gen 3
			expect(gaShort.evolve()).toBe(false); // Done

			expect(gaShort.getGeneration()).toBe(3);
		});

		test("should maintain population size after evolution", () => {
			ga.initializePopulation();
			const initialSize = ga.getPopulation().length;

			ga.evolve();
			const newSize = ga.getPopulation().length;

			expect(newSize).toBe(initialSize);
		});

		test("should improve fitness over generations with seeded randomness", () => {
			ga.initializePopulation();
			const initialBest = ga.getBestIndividual()?.fitness;
			expect(initialBest).toBeDefined();

			// Evolve for several generations
			for (let i = 0; i < 10; i++) {
				ga.evolve();
			}

			const finalBest = ga.getBestIndividual()?.fitness;
			expect(finalBest).toBeDefined();

			// This fixed random sequence should improve fitness (lower is better).
			if (initialBest !== undefined && finalBest !== undefined) {
				expect(finalBest).toBeLessThanOrEqual(initialBest);
			}
		});
	});

	describe("Configuration", () => {
		test("should use custom configuration", () => {
			const customConfig: GAConfig = {
				populationSize: 50,
				generations: 20,
				mutationRate: 0.2,
				crossoverRate: 0.9,
				tournamentSize: 5,
				bounds: { min: -50, max: 50 },
				functionType: "sphere",
			};

			const customGA = new GeneticAlgorithm(customConfig, random);
			customGA.initializePopulation();
			expect(customGA.getBounds()).toEqual(customConfig.bounds);
			expect(customGA.getPopulation()).toHaveLength(
				customConfig.populationSize,
			);
			for (let i = 0; i < customConfig.generations; i++)
				expect(customGA.evolve()).toBe(true);
			expect(customGA.evolve()).toBe(false);
		});

		test("should use default configuration when none provided", () => {
			const defaultGA = new GeneticAlgorithm();
			defaultGA.initializePopulation();
			expect(defaultGA.getPopulation()).toHaveLength(
				DEFAULT_CONFIG.populationSize,
			);
			expect(defaultGA.getBounds()).toEqual(DEFAULT_CONFIG.bounds);
		});
	});
});
