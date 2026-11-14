import { batch, createMemo, createSignal } from "solid-js";
import {
	DEFAULT_ANIMATION_SPEED,
	DEFAULT_FUNCTION_TYPE,
	DEFAULT_GENERATIONS,
	DEFAULT_POPULATION_SIZE,
	MAX_GENERATIONS,
	MAX_POPULATION_SIZE,
	MIN_GENERATIONS,
	MIN_POPULATION_SIZE,
} from "../constants";
import {
	DEFAULT_GA_PARAMETERS,
	GA_PARAMETER_FIELDS,
	type GAParameterName,
	isValidGAParameter,
} from "../ga-parameters";
import {
	DEFAULT_CONFIG,
	type GAConfig,
	GeneticAlgorithm,
} from "../genetic-algorithm";
import {
	type FunctionType,
	getObjectiveFunction,
} from "../objective-functions";

import { createGenerationTimer } from "./create-generation-timer";

export type RunStatus = "ready" | "running" | "paused" | "completed";

export function useGeneticAlgorithm() {
	const [populationSize, setPopulationSize] = createSignal(
		DEFAULT_POPULATION_SIZE,
	);
	const [generations, setGenerations] = createSignal(DEFAULT_GENERATIONS);
	const [parameters, setParameters] = createSignal({
		...DEFAULT_GA_PARAMETERS,
	});
	const [functionType, setFunctionType] = createSignal<FunctionType>(
		DEFAULT_FUNCTION_TYPE,
	);
	const createGAConfig = (): GAConfig => ({
		...DEFAULT_CONFIG,
		...parameters(),
		populationSize: populationSize(),
		generations: generations(),
		functionType: functionType(),
		bounds: getObjectiveFunction(functionType()).bounds,
	});

	const [ga, setGA] = createSignal(new GeneticAlgorithm(createGAConfig()));
	const readLatestResult = () => ({
		population: ga().getPopulation(),
		statistics: ga().getStatistics(),
	});
	const [latestResult, setLatestResult] = createSignal(readLatestResult());
	const population = () => latestResult().population;
	const statistics = () => latestResult().statistics;
	const [selectedGeneration, setSelectedGeneration] = createSignal<
		number | null
	>(null);
	const displayedGeneration = () =>
		selectedGeneration() ?? statistics().generation;
	const isViewingHistory = () =>
		displayedGeneration() < statistics().generation;
	const displayedSnapshot = createMemo(() => {
		const selected = selectedGeneration();
		if (selected !== null) {
			const snapshot = ga().getSnapshot(selected);
			if (snapshot) return snapshot;
		}
		return {
			generation: statistics().generation,
			population: population(),
			averageFitness: statistics().averageFitness.at(-1) ?? 0,
			currentBest: statistics().currentBest,
			bestEver: statistics().bestEver,
			bestEverGeneration: statistics().bestEverGeneration,
		};
	});
	const [isRunning, setIsRunning] = createSignal(false);
	const [hasStarted, setHasStarted] = createSignal(false);
	const runStatus = (): RunStatus => {
		if (statistics().generation >= generations()) return "completed";
		if (isRunning()) return "running";
		return hasStarted() ? "paused" : "ready";
	};
	const settingsLocked = () => hasStarted();
	const [animationSpeed, setAnimationSpeed] = createSignal(
		DEFAULT_ANIMATION_SPEED,
	);

	const syncFromGA = () => {
		setLatestResult(readLatestResult());
	};

	const initializeGA = () => {
		setSelectedGeneration(null);
		setHasStarted(false);
		ga().initializePopulation();
		syncFromGA();
	};

	const step = () => {
		setSelectedGeneration(null);
		setHasStarted(true);
		const canContinue = ga().evolve();
		syncFromGA();

		if (!canContinue || ga().getGeneration() >= generations()) {
			stop();
		}
	};

	const timer = createGenerationTimer({
		interval: animationSpeed,
		isRunning,
		onGeneration: step,
	});

	const start = () => {
		if (isRunning() || ga().getGeneration() >= generations()) return;

		setHasStarted(true);
		setIsRunning(true);
		setSelectedGeneration(null);
		timer.start();
	};

	const stop = () => {
		setIsRunning(false);
		timer.cancel();
	};

	const selectGeneration = (generation: number) => {
		if (!Number.isFinite(generation)) return;
		stop();
		const selected = Math.max(
			0,
			Math.min(statistics().generation, Math.round(generation)),
		);
		setSelectedGeneration(
			selected === statistics().generation ? null : selected,
		);
	};
	const showLatest = () => setSelectedGeneration(null);

	const reset = () => {
		stop();
		initializeGA();
	};

	const restart = () => {
		reset();
		start();
	};

	const updateGAConfig = () => {
		batch(() => {
			setGA(new GeneticAlgorithm(createGAConfig()));
			initializeGA();
		});
	};

	const changePopulationSize = (value: number) => {
		if (settingsLocked()) return populationSize();
		const numValue = Number.isInteger(value) ? value : populationSize();
		const clampedValue = Math.max(
			MIN_POPULATION_SIZE,
			Math.min(MAX_POPULATION_SIZE, numValue),
		);
		if (clampedValue === populationSize()) return clampedValue;

		setPopulationSize(clampedValue);
		updateGAConfig();

		return clampedValue;
	};

	const changeGenerations = (value: number) => {
		if (settingsLocked()) return generations();
		const numValue = Number.isInteger(value) ? value : generations();
		const clampedValue = Math.max(
			MIN_GENERATIONS,
			Math.min(MAX_GENERATIONS, numValue),
		);
		if (clampedValue === generations()) return clampedValue;

		setGenerations(clampedValue);
		updateGAConfig();

		return clampedValue;
	};

	const handleSpeedChange = (interval: number) => {
		setAnimationSpeed(interval);

		if (isRunning()) timer.reschedule();
	};

	const handleParameterChange = (name: GAParameterName, value: number) => {
		if (
			settingsLocked() ||
			!isValidGAParameter(name, value) ||
			parameters()[name] === value
		)
			return;
		setParameters((current) => ({ ...current, [name]: value }));
		updateGAConfig();
	};

	const resetParameters = () => {
		if (settingsLocked()) return;
		if (
			GA_PARAMETER_FIELDS.every(
				({ key }) => parameters()[key] === DEFAULT_GA_PARAMETERS[key],
			)
		)
			return;
		setParameters({ ...DEFAULT_GA_PARAMETERS });
		updateGAConfig();
	};

	const changeFunctionType = (value: FunctionType) => {
		if (settingsLocked() || value === functionType()) return;
		setFunctionType(value);
		updateGAConfig();
	};

	initializeGA();

	return {
		// State
		populationSize,
		generations,
		parameters,
		functionType,
		ga,
		population,
		statistics,
		displayedGeneration,
		displayedSnapshot,
		isViewingHistory,
		selectGeneration,
		showLatest,
		isRunning,
		settingsLocked,
		runStatus,
		animationSpeed,

		// Actions
		start,
		stop,
		step,
		reset,
		restart,
		resetParameters,

		// Setting actions
		handleSpeedChange,
		handleParameterChange,
		changePopulationSize,
		changeGenerations,
		changeFunctionType,

		// Constants for validation
		constraints: {
			minPopulationSize: MIN_POPULATION_SIZE,
			maxPopulationSize: MAX_POPULATION_SIZE,
			minGenerations: MIN_GENERATIONS,
			maxGenerations: MAX_GENERATIONS,
		},
	};
}
