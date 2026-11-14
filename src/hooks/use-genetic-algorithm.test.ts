import { cleanup, renderHook } from "@solidjs/testing-library";
import { createComputed } from "solid-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_GA_PARAMETERS } from "../ga-parameters";
import {
	DEFAULT_CONFIG,
	type GenerationSnapshot,
	GeneticAlgorithm,
} from "../genetic-algorithm";
import { useGeneticAlgorithm } from "./use-genetic-algorithm";

const fields = [
	{
		name: "populationSize",
		change: "changePopulationSize",
		value: "150",
	},
	{
		name: "generations",
		change: "changeGenerations",
		value: "60",
	},
] as const;

describe("Genetic algorithm settings", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	test("publishes matching population and statistics throughout run and history changes", () => {
		const snapshots: GenerationSnapshot[] = [];
		const { result } = renderHook(() => {
			const simulation = useGeneticAlgorithm();
			createComputed(() => snapshots.push(simulation.displayedSnapshot()));
			return simulation;
		});
		result.changePopulationSize(12);
		result.step();
		result.step();
		result.selectGeneration(1);
		result.showLatest();
		result.reset();
		result.changeFunctionType("beale");
		result.restart();
		vi.advanceTimersByTime(result.animationSpeed());

		for (const snapshot of snapshots) {
			expect(snapshot.population).toContain(snapshot.currentBest);
			expect(snapshot.averageFitness).toBeCloseTo(
				snapshot.population.reduce(
					(sum, individual) => sum + individual.fitness,
					0,
				) / snapshot.population.length,
				10,
			);
		}
	});

	test.each(fields)(
		"uses $name changes directly before the first run",
		({ name, change, value }) => {
			const { result } = renderHook(useGeneticAlgorithm);
			result[change](Number(value));
			expect(result[name]()).toBe(Number(value));
			expect(result.settingsLocked()).toBe(false);
			expect(result.statistics().generation).toBe(0);
			result.start();
			expect(result.settingsLocked()).toBe(true);
			expect(result.isRunning()).toBe(true);
		},
	);

	test.each(fields)(
		"ignores a nonnumeric $name without recreating the population",
		({ name, change }) => {
			const { result } = renderHook(useGeneticAlgorithm);
			const statistics = result.statistics();
			const original = result[name]();
			expect(result[change](Number.NaN)).toBe(original);
			expect(result[name]()).toBe(original);
			expect(result.statistics()).toBe(statistics);
		},
	);

	test.each(fields)(
		"locks $name through running, paused and completed states until reset",
		({ name, change, value }) => {
			const { result } = renderHook(useGeneticAlgorithm);
			const original = result[name]();
			result.start();
			result[change](Number(value));
			expect(result[name]()).toBe(original);
			result.stop();
			const paused = result.statistics();
			result[change](Number(value));
			expect(result[name]()).toBe(original);
			expect(result.statistics()).toBe(paused);
			result.start();
			vi.advanceTimersByTime(result.animationSpeed() * result.generations());
			expect(result.runStatus()).toBe("completed");
			const completed = result.statistics();
			result[change](Number(value));
			expect(result[name]()).toBe(original);
			expect(result.statistics()).toBe(completed);
			result.reset();
			expect(result.settingsLocked()).toBe(false);
			result[change](Number(value));
			expect(result[name]()).toBe(Number(value));
		},
	);

	test("locks the objective function after a single step and permits changes after reset", () => {
		const { result } = renderHook(useGeneticAlgorithm);
		result.changeFunctionType("beale");
		expect(result.ga().getBounds()).toEqual({ min: -4.5, max: 4.5 });
		result.step();
		const statistics = result.statistics();
		result.changeFunctionType("sphere");
		expect(result.functionType()).toBe("beale");
		expect(result.statistics()).toBe(statistics);
		result.reset();
		result.changeFunctionType("sphere");
		expect(result.functionType()).toBe("sphere");
		expect(result.ga().getBounds()).toEqual({ min: -10, max: 10 });
	});

	test("applies advanced parameters to evolution and retains them when other settings change or a run restarts", () => {
		const { result } = renderHook(useGeneticAlgorithm);
		result.handleParameterChange("mutationRate", 0);
		result.handleParameterChange("crossoverRate", 0);
		result.handleParameterChange("tournamentSize", 1);
		result.changePopulationSize(10);
		result.changeGenerations(1);
		result.changeFunctionType("beale");
		const parameters = { mutationRate: 0, crossoverRate: 0, tournamentSize: 1 };
		const seededRandom = () => {
			let state = 42;
			return () => {
				state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
				return state / 2 ** 32;
			};
		};
		const random = vi.spyOn(Math, "random").mockImplementation(seededRandom());
		result.reset();
		result.step();
		const actual = result.population();
		random.mockImplementation(seededRandom());
		const expected = new GeneticAlgorithm({
			...DEFAULT_CONFIG,
			...parameters,
			populationSize: 10,
			generations: 1,
			functionType: "beale",
			bounds: { min: -4.5, max: 4.5 },
		});
		expected.initializePopulation();
		expected.evolve();
		expect(actual).toEqual(expected.getPopulation());
		random.mockImplementation(seededRandom());
		result.restart();
		vi.advanceTimersByTime(result.animationSpeed());
		expect(result.population()).toEqual(actual);
		expect(result.parameters()).toEqual(parameters);
	});

	test("validates advanced parameter boundaries and resets them without changing basic settings", () => {
		const { result } = renderHook(useGeneticAlgorithm);
		const initial = result.statistics();
		for (const value of [-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY]) {
			result.handleParameterChange("mutationRate", value);
			result.handleParameterChange("crossoverRate", value);
		}
		for (const value of [0, 1.5, 1001, Number.NaN]) {
			result.handleParameterChange("tournamentSize", value);
		}
		expect(result.parameters()).toEqual(DEFAULT_GA_PARAMETERS);
		expect(result.statistics()).toBe(initial);
		result.resetParameters();
		expect(result.statistics()).toBe(initial);
		result.changePopulationSize(1);
		result.changeGenerations(5);
		result.changeFunctionType("ackley");
		result.handleParameterChange("mutationRate", 0);
		result.handleParameterChange("crossoverRate", 1);
		result.handleParameterChange("tournamentSize", 1000);
		expect(result.parameters()).toEqual({
			mutationRate: 0,
			crossoverRate: 1,
			tournamentSize: 1000,
		});
		result.resetParameters();
		expect(result.parameters()).toEqual(DEFAULT_GA_PARAMETERS);
		expect(result.populationSize()).toBe(1);
		expect(result.generations()).toBe(5);
		expect(result.functionType()).toBe("ackley");
	});

	test("locks advanced changes and restoring defaults until the run is reset", () => {
		const { result } = renderHook(useGeneticAlgorithm);
		result.handleParameterChange("mutationRate", 0.25);
		result.handleParameterChange("crossoverRate", 0.5);
		result.handleParameterChange("tournamentSize", 5);
		const parameters = result.parameters();
		const tryChanges = () => {
			const statistics = result.statistics();
			result.handleParameterChange("mutationRate", 0);
			result.handleParameterChange("crossoverRate", 0);
			result.handleParameterChange("tournamentSize", 1);
			result.resetParameters();
			expect(result.parameters()).toBe(parameters);
			expect(result.statistics()).toBe(statistics);
		};
		result.start();
		tryChanges();
		result.stop();
		tryChanges();
		result.start();
		vi.advanceTimersByTime(result.animationSpeed() * result.generations());
		expect(result.runStatus()).toBe("completed");
		tryChanges();
		result.reset();
		expect(result.parameters()).toBe(parameters);
		result.resetParameters();
		expect(result.parameters()).toEqual(DEFAULT_GA_PARAMETERS);
	});

	test("continues evolving while speed changes repeatedly", () => {
		const { result, cleanup: unmount } = renderHook(useGeneticAlgorithm);
		result.start();
		for (let i = 0; i < 15; i++) {
			vi.advanceTimersByTime(100);
			result.handleSpeedChange(i % 2 === 0 ? 500 : 550);
		}
		expect(result.statistics().generation).toBeGreaterThanOrEqual(2);
		expect(result.runStatus()).toBe("running");
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	test("applies speed changes to elapsed time without evolving while paused", () => {
		const { result } = renderHook(useGeneticAlgorithm);
		result.start();
		vi.advanceTimersByTime(400);
		result.handleSpeedChange(200);
		vi.advanceTimersByTime(0);
		expect(result.statistics().generation).toBe(1);
		vi.advanceTimersByTime(100);
		result.handleSpeedChange(1000);
		vi.advanceTimersByTime(899);
		expect(result.statistics().generation).toBe(1);
		vi.advanceTimersByTime(1);
		expect(result.statistics().generation).toBe(2);
		result.stop();
		result.handleSpeedChange(50);
		vi.advanceTimersByTime(1000);
		expect(result.statistics().generation).toBe(2);
		result.start();
		vi.advanceTimersByTime(50);
		expect(result.statistics().generation).toBe(3);
	});

	test("pauses to inspect history and resumes from the latest population", () => {
		const { result } = renderHook(useGeneticAlgorithm);
		result.start();
		vi.advanceTimersByTime(500);
		const generationOne = result.population();
		vi.advanceTimersByTime(1000);
		const latest = result.population();
		result.selectGeneration(1);
		expect(result.isRunning()).toBe(false);
		expect(result.statistics().generation).toBe(3);
		expect(result.displayedSnapshot().population).toEqual(generationOne);
		expect(result.population()).toBe(latest);
		expect(result.isViewingHistory()).toBe(true);
		vi.advanceTimersByTime(1000);
		expect(result.statistics().generation).toBe(3);
		result.start();
		expect(result.displayedGeneration()).toBe(3);
		vi.advanceTimersByTime(500);
		expect(result.displayedGeneration()).toBe(4);
		result.selectGeneration(1);
		result.reset();
		expect(result.displayedGeneration()).toBe(0);
		expect(result.ga().getSnapshot(1)).toBeUndefined();
	});
});
