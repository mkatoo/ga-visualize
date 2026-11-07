import {
	DEFAULT_FUNCTION_TYPE,
	DEFAULT_GENERATIONS,
	DEFAULT_POPULATION_SIZE,
} from "./constants";
import {
	blxAlphaCrossover,
	gaussianMutation,
	type RandomSource,
	tournamentSelection,
} from "./ga-operators";
import { type FunctionType, getObjectiveFunction } from "./objective-functions";

export interface Individual {
	x: number;
	y: number;
	fitness: number;
}

export interface Statistics {
	generation: number;
	bestFitness: number[];
	averageFitness: number[];
	currentBest: Individual | null;
	bestEver: Individual | null;
	bestEverGeneration: number;
}

export interface GenerationSnapshot {
	generation: number;
	population: Individual[];
	averageFitness: number;
	currentBest: Individual | null;
	bestEver: Individual | null;
	bestEverGeneration: number;
}

interface PopulationFrame {
	coordinates: Float64Array;
	averageFitness: number;
	bestIndex: number;
	bestEver: Individual | null;
	bestEverGeneration: number;
}

export interface GAConfig {
	populationSize: number;
	generations: number;
	mutationRate: number;
	crossoverRate: number;
	tournamentSize: number;
	bounds: { min: number; max: number };
	functionType: FunctionType;
}

export const DEFAULT_CONFIG: GAConfig = {
	populationSize: DEFAULT_POPULATION_SIZE,
	generations: DEFAULT_GENERATIONS,
	mutationRate: 0.1,
	crossoverRate: 0.8,
	tournamentSize: 3,
	bounds: { min: -100, max: 100 },
	functionType: DEFAULT_FUNCTION_TYPE,
};

export class GeneticAlgorithm {
	private config: GAConfig;
	private population: Individual[] = [];
	private generation = 0;
	private bestFitness: number[] = [];
	private averageFitness: number[] = [];
	private bestEver: Individual | null = null;
	private bestEverGeneration = 0;
	private history: PopulationFrame[] = [];

	constructor(
		config: GAConfig = DEFAULT_CONFIG,
		private readonly random: RandomSource = () => Math.random(),
	) {
		this.config = config;
	}

	private evaluateFunction(x: number, y: number): number {
		const objFunc = getObjectiveFunction(this.config.functionType);
		return objFunc.fn(x, y);
	}

	private createRandomIndividual(): Individual {
		const { min, max } = this.config.bounds;
		const x = this.random() * (max - min) + min;
		const y = this.random() * (max - min) + min;
		return {
			x,
			y,
			fitness: this.evaluateFunction(x, y),
		};
	}

	private evaluatePopulation(): void {
		for (const individual of this.population) {
			individual.fitness = this.evaluateFunction(individual.x, individual.y);
		}
	}

	initializePopulation(): void {
		this.population = [];
		this.generation = 0;
		this.bestFitness = [];
		this.averageFitness = [];
		this.bestEver = null;
		this.bestEverGeneration = 0;
		this.history = [];

		for (let i = 0; i < this.config.populationSize; i++) {
			this.population.push(this.createRandomIndividual());
		}

		this.evaluatePopulation();
		this.updateStatistics();
	}

	evolve(): boolean {
		if (this.generation >= this.config.generations) {
			return false;
		}

		const newPopulation: Individual[] = [];

		while (newPopulation.length < this.config.populationSize) {
			const parent1 = tournamentSelection(
				this.population,
				this.config.tournamentSize,
				this.random,
			);
			const parent2 = tournamentSelection(
				this.population,
				this.config.tournamentSize,
				this.random,
			);

			let child1: Individual, child2: Individual;

			if (this.random() < this.config.crossoverRate) {
				[child1, child2] = blxAlphaCrossover(
					parent1,
					parent2,
					this.config.bounds,
					this.random,
				);
			} else {
				child1 = { ...parent1 };
				child2 = { ...parent2 };
			}

			child1 = gaussianMutation(
				child1,
				this.config.bounds,
				this.config.mutationRate,
				this.random,
			);
			child2 = gaussianMutation(
				child2,
				this.config.bounds,
				this.config.mutationRate,
				this.random,
			);

			newPopulation.push(child1);
			if (newPopulation.length < this.config.populationSize) {
				newPopulation.push(child2);
			}
		}

		this.population = newPopulation;
		this.evaluatePopulation();
		this.generation++;
		this.updateStatistics();

		return true;
	}

	private updateStatistics(): void {
		const fitnesses = this.population.map((ind) => ind.fitness);
		const best = Math.min(...fitnesses);
		const average = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;

		this.bestFitness.push(best);
		this.averageFitness.push(average);
		const currentBest = this.getBestIndividual();
		if (
			currentBest &&
			(!this.bestEver || currentBest.fitness < this.bestEver.fitness)
		) {
			this.bestEver = { ...currentBest };
			this.bestEverGeneration = this.generation;
		}
		// Store only three numbers per individual, avoiding a full statistics copy per generation.
		const coordinates = new Float64Array(this.population.length * 3);
		this.population.forEach((individual, index) => {
			coordinates.set(
				[individual.x, individual.y, individual.fitness],
				index * 3,
			);
		});
		this.history.push({
			coordinates,
			averageFitness: average,
			bestIndex: currentBest ? this.population.indexOf(currentBest) : -1,
			bestEver: this.bestEver ? { ...this.bestEver } : null,
			bestEverGeneration: this.bestEverGeneration,
		});
	}

	getSnapshot(generation: number): GenerationSnapshot | undefined {
		const frame = this.history[generation];
		if (!frame) return undefined;
		const population: Individual[] = [];
		for (let i = 0; i < frame.coordinates.length; i += 3) {
			population.push({
				x: frame.coordinates[i],
				y: frame.coordinates[i + 1],
				fitness: frame.coordinates[i + 2],
			});
		}
		return {
			generation,
			population,
			averageFitness: frame.averageFitness,
			currentBest: population[frame.bestIndex] ?? null,
			bestEver: frame.bestEver ? { ...frame.bestEver } : null,
			bestEverGeneration: frame.bestEverGeneration,
		};
	}

	getPopulation(): Individual[] {
		return [...this.population];
	}

	getGeneration(): number {
		return this.generation;
	}

	getBestIndividual(): Individual | null {
		if (this.population.length === 0) {
			return null;
		}
		return this.population.reduce((best, current) =>
			current.fitness < best.fitness ? current : best,
		);
	}

	getStatistics(): Statistics {
		return {
			generation: this.generation,
			bestFitness: [...this.bestFitness],
			averageFitness: [...this.averageFitness],
			currentBest: this.getBestIndividual(),
			bestEver: this.bestEver ? { ...this.bestEver } : null,
			bestEverGeneration: this.bestEverGeneration,
		};
	}

	getBounds() {
		return this.config.bounds;
	}
}
