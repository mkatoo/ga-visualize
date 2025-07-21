export interface Individual {
	x: number;
	y: number;
	fitness: number;
}

export interface GAConfig {
	populationSize: number;
	generations: number;
	mutationRate: number;
	crossoverRate: number;
	tournamentSize: number;
	bounds: { min: number; max: number };
}

export const DEFAULT_CONFIG: GAConfig = {
	populationSize: 100,
	generations: 50,
	mutationRate: 0.1,
	crossoverRate: 0.8,
	tournamentSize: 3,
	bounds: { min: -100, max: 100 },
};

export class GeneticAlgorithm {
	private config: GAConfig;
	private population: Individual[] = [];
	private generation = 0;
	private bestFitness: number[] = [];
	private averageFitness: number[] = [];

	constructor(config: GAConfig = DEFAULT_CONFIG) {
		this.config = config;
	}

	private sphereFunction(x: number, y: number): number {
		return x * x + y * y;
	}

	private createRandomIndividual(): Individual {
		const { min, max } = this.config.bounds;
		const x = Math.random() * (max - min) + min;
		const y = Math.random() * (max - min) + min;
		return {
			x,
			y,
			fitness: this.sphereFunction(x, y),
		};
	}

	private evaluatePopulation(): void {
		for (const individual of this.population) {
			individual.fitness = this.sphereFunction(individual.x, individual.y);
		}
	}

	private tournamentSelection(): Individual {
		let best =
			this.population[Math.floor(Math.random() * this.population.length)];

		for (let i = 1; i < this.config.tournamentSize; i++) {
			const candidate =
				this.population[Math.floor(Math.random() * this.population.length)];
			if (candidate.fitness < best.fitness) {
				best = candidate;
			}
		}

		return { ...best };
	}

	private blxAlphaCrossover(
		parent1: Individual,
		parent2: Individual,
		alpha = 0.5,
	): [Individual, Individual] {
		const dx = Math.abs(parent1.x - parent2.x);
		const dy = Math.abs(parent1.y - parent2.y);

		const minX = Math.min(parent1.x, parent2.x) - alpha * dx;
		const maxX = Math.max(parent1.x, parent2.x) + alpha * dx;
		const minY = Math.min(parent1.y, parent2.y) - alpha * dy;
		const maxY = Math.max(parent1.y, parent2.y) + alpha * dy;

		const child1: Individual = {
			x: Math.random() * (maxX - minX) + minX,
			y: Math.random() * (maxY - minY) + minY,
			fitness: 0,
		};

		const child2: Individual = {
			x: Math.random() * (maxX - minX) + minX,
			y: Math.random() * (maxY - minY) + minY,
			fitness: 0,
		};

		const { min, max } = this.config.bounds;
		child1.x = Math.max(min, Math.min(max, child1.x));
		child1.y = Math.max(min, Math.min(max, child1.y));
		child2.x = Math.max(min, Math.min(max, child2.x));
		child2.y = Math.max(min, Math.min(max, child2.y));

		return [child1, child2];
	}

	private gaussianMutation(individual: Individual): Individual {
		const mutated = { ...individual };

		if (Math.random() < this.config.mutationRate) {
			const sigma = (this.config.bounds.max - this.config.bounds.min) * 0.1;
			mutated.x += this.gaussianRandom() * sigma;
			mutated.y += this.gaussianRandom() * sigma;

			const { min, max } = this.config.bounds;
			mutated.x = Math.max(min, Math.min(max, mutated.x));
			mutated.y = Math.max(min, Math.min(max, mutated.y));
		}

		return mutated;
	}

	private gaussianRandom(): number {
		let u = 0,
			v = 0;
		while (u === 0) u = Math.random();
		while (v === 0) v = Math.random();
		return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	}

	initializePopulation(): void {
		this.population = [];
		this.generation = 0;
		this.bestFitness = [];
		this.averageFitness = [];

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
			const parent1 = this.tournamentSelection();
			const parent2 = this.tournamentSelection();

			let child1: Individual, child2: Individual;

			if (Math.random() < this.config.crossoverRate) {
				[child1, child2] = this.blxAlphaCrossover(parent1, parent2);
			} else {
				child1 = { ...parent1 };
				child2 = { ...parent2 };
			}

			child1 = this.gaussianMutation(child1);
			child2 = this.gaussianMutation(child2);

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

	getStatistics() {
		return {
			generation: this.generation,
			bestFitness: [...this.bestFitness],
			averageFitness: [...this.averageFitness],
			currentBest: this.getBestIndividual(),
		};
	}
}
