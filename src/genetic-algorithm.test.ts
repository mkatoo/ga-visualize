import { beforeEach, describe, expect, test } from "vitest";
import {
	DEFAULT_CONFIG,
	type GAConfig,
	GeneticAlgorithm,
	type Individual,
} from "./genetic-algorithm";

// Type helper for testing private methods
interface GeneticAlgorithmTestable {
	sphereFunction(x: number, y: number): number;
	createRandomIndividual(): Individual;
	gaussianRandom(): number;
	tournamentSelection(): Individual;
	blxAlphaCrossover(parent1: Individual, parent2: Individual, alpha?: number): [Individual, Individual];
	gaussianMutation(individual: Individual): Individual;
	population: Individual[];
	config: GAConfig;
}

describe("GeneticAlgorithm", () => {
	let ga: GeneticAlgorithm;

	beforeEach(() => {
		ga = new GeneticAlgorithm();
	});

	describe("Sphere Function", () => {
		test("should calculate sphere function correctly", () => {
			// Access private method through type assertion for testing
			const testableGA = ga as unknown as GeneticAlgorithmTestable;
			const sphereFunction = testableGA.sphereFunction.bind(testableGA);

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
			const gaWithBounds = new GeneticAlgorithm(config);

			for (let i = 0; i < 100; i++) {
				const testableGA = gaWithBounds as unknown as GeneticAlgorithmTestable;
				const individual = testableGA.createRandomIndividual();
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
			const testableGA = ga as unknown as GeneticAlgorithmTestable;
			const individual = testableGA.createRandomIndividual();
			const expectedFitness =
				individual.x * individual.x + individual.y * individual.y;
			expect(individual.fitness).toBe(expectedFitness);
		});
	});

	describe("Gaussian Random", () => {
		test("should generate numbers with approximately normal distribution", () => {
			const samples: number[] = [];
			for (let i = 0; i < 1000; i++) {
				const testableGA = ga as unknown as GeneticAlgorithmTestable;
				samples.push(testableGA.gaussianRandom());
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

			const testableGA = ga as unknown as GeneticAlgorithmTestable;
			testableGA.population = population;
			testableGA.config.tournamentSize = 2;

			// Run tournament selection multiple times and check it tends to select better individuals
			const results: number[] = [];
			for (let i = 0; i < 100; i++) {
				const testableGA = ga as unknown as GeneticAlgorithmTestable;
				const selected = testableGA.tournamentSelection();
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

			const testableGA = ga as unknown as GeneticAlgorithmTestable;
			const [child1, child2] = testableGA.blxAlphaCrossover(
				parent1,
				parent2,
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
			const gaWithBounds = new GeneticAlgorithm(config);

			const parent1: Individual = { x: -4, y: -4, fitness: 32 };
			const parent2: Individual = { x: 4, y: 4, fitness: 32 };

			const testableGA = gaWithBounds as unknown as GeneticAlgorithmTestable;
			const [child1, child2] = testableGA.blxAlphaCrossover(
				parent1,
				parent2,
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
			const gaNoMutation = new GeneticAlgorithm(config);

			const individual: Individual = { x: 1, y: 2, fitness: 5 };
			const testableGA = gaNoMutation as unknown as GeneticAlgorithmTestable;
			const mutated = testableGA.gaussianMutation(individual);

			expect(mutated.x).toBe(individual.x);
			expect(mutated.y).toBe(individual.y);
		});

		test("should respect bounds after mutation", () => {
			const config: GAConfig = {
				...DEFAULT_CONFIG,
				mutationRate: 1.0, // Always mutate
				bounds: { min: -10, max: 10 },
			};
			const gaAlwaysMutate = new GeneticAlgorithm(config);

			for (let i = 0; i < 50; i++) {
				const individual: Individual = { x: 9, y: 9, fitness: 162 };
				const testableGA = gaAlwaysMutate as unknown as GeneticAlgorithmTestable;
				const mutated = testableGA.gaussianMutation(individual);

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
			const population: Individual[] = [
				{ x: 2, y: 3, fitness: 13 },
				{ x: 0, y: 1, fitness: 1 }, // best
				{ x: 1, y: 2, fitness: 5 },
			];

			const testableGA = ga as unknown as GeneticAlgorithmTestable;
			testableGA.population = population;

			const best = ga.getBestIndividual();
			expect(best).not.toBeNull();
			expect(best?.fitness).toBe(1);
			expect(best?.x).toBe(0);
			expect(best?.y).toBe(1);
		});
	});

	describe("Statistics", () => {
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

		test("should improve fitness over generations (statistical test)", () => {
			ga.initializePopulation();
			const initialBest = ga.getBestIndividual()?.fitness;
			expect(initialBest).toBeDefined();

			// Evolve for several generations
			for (let i = 0; i < 10; i++) {
				ga.evolve();
			}

			const finalBest = ga.getBestIndividual()?.fitness;
			expect(finalBest).toBeDefined();

			// In most cases, fitness should improve (lower values are better)
			// This is a statistical test, might occasionally fail
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
			};

			const customGA = new GeneticAlgorithm(customConfig);
			const testableGA = customGA as unknown as GeneticAlgorithmTestable;
			expect(testableGA.config).toEqual(customConfig);
		});

		test("should use default configuration when none provided", () => {
			const defaultGA = new GeneticAlgorithm();
			const testableGA = defaultGA as unknown as GeneticAlgorithmTestable;
			expect(testableGA.config).toEqual(DEFAULT_CONFIG);
		});
	});
});
