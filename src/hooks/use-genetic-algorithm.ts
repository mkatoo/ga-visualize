import { createSignal, onCleanup } from "solid-js";
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
import { DEFAULT_CONFIG, GeneticAlgorithm } from "../genetic-algorithm";
import {
	type FunctionType,
	getObjectiveFunction,
} from "../objective-functions";

export function useGeneticAlgorithm() {
	const [populationSize, setPopulationSize] = createSignal(
		DEFAULT_POPULATION_SIZE,
	);
	const [generations, setGenerations] = createSignal(DEFAULT_GENERATIONS);
	const [functionType, setFunctionType] = createSignal<FunctionType>(
		DEFAULT_FUNCTION_TYPE,
	);

	const getBoundsForFunction = (type: FunctionType) => {
		return getObjectiveFunction(type).bounds;
	};

	const [ga, setGA] = createSignal(
		new GeneticAlgorithm({
			...DEFAULT_CONFIG,
			populationSize: populationSize(),
			generations: generations(),
			functionType: functionType(),
			bounds: getBoundsForFunction(functionType()),
		}),
	);
	const [population, setPopulation] = createSignal(ga().getPopulation());
	const [statistics, setStatistics] = createSignal(ga().getStatistics());
	const [isRunning, setIsRunning] = createSignal(false);
	const [animationSpeed, setAnimationSpeed] = createSignal(
		DEFAULT_ANIMATION_SPEED,
	);

	let intervalId: number | null = null;

	const initializeGA = () => {
		ga().initializePopulation();
		setPopulation(ga().getPopulation());
		setStatistics(ga().getStatistics());
	};

	const step = () => {
		const canContinue = ga().evolve();
		setPopulation(ga().getPopulation());
		setStatistics(ga().getStatistics());

		if (!canContinue) {
			stop();
		}
	};

	const start = () => {
		if (isRunning()) return;

		setIsRunning(true);
		intervalId = setInterval(() => {
			step();
		}, animationSpeed());
	};

	const stop = () => {
		setIsRunning(false);
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	};

	const reset = () => {
		stop();
		initializeGA();
	};

	const updateGAConfig = () => {
		const newGA = new GeneticAlgorithm({
			...DEFAULT_CONFIG,
			populationSize: populationSize(),
			generations: generations(),
			functionType: functionType(),
			bounds: getBoundsForFunction(functionType()),
		});
		setGA(newGA);
		newGA.initializePopulation();
		setPopulation(newGA.getPopulation());
		setStatistics(newGA.getStatistics());
	};

	const validateAndSetPopulationSize = (value: string) => {
		const numValue = parseInt(value) || MIN_POPULATION_SIZE;
		const clampedValue = Math.max(
			MIN_POPULATION_SIZE,
			Math.min(MAX_POPULATION_SIZE, numValue),
		);
		setPopulationSize(clampedValue);

		if (!isRunning()) {
			updateGAConfig();
		}

		return clampedValue;
	};

	const validateAndSetGenerations = (value: string) => {
		const numValue = parseInt(value) || MIN_GENERATIONS;
		const clampedValue = Math.max(
			MIN_GENERATIONS,
			Math.min(MAX_GENERATIONS, numValue),
		);
		setGenerations(clampedValue);

		if (!isRunning()) {
			updateGAConfig();
		}

		return clampedValue;
	};

	const handleSpeedChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const speed = parseInt(target.value);
		setAnimationSpeed(speed);

		if (isRunning()) {
			stop();
			start();
		}
	};

	const handlePopulationSizeChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		validateAndSetPopulationSize(target.value);
	};

	const handlePopulationSizeBlur = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const clampedValue = validateAndSetPopulationSize(target.value);
		target.value = clampedValue.toString();
	};

	const handleGenerationsChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		validateAndSetGenerations(target.value);
	};

	const handleGenerationsBlur = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const clampedValue = validateAndSetGenerations(target.value);
		target.value = clampedValue.toString();
	};

	const handleFunctionTypeChange = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		const newFunctionType = target.value as FunctionType;
		setFunctionType(newFunctionType);

		if (!isRunning()) {
			updateGAConfig();
		}
	};

	onCleanup(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});

	initializeGA();

	return {
		// State
		populationSize,
		generations,
		functionType,
		ga,
		population,
		statistics,
		isRunning,
		animationSpeed,

		// Actions
		start,
		stop,
		step,
		reset,

		// Event handlers
		handleSpeedChange,
		handlePopulationSizeChange,
		handlePopulationSizeBlur,
		handleGenerationsChange,
		handleGenerationsBlur,
		handleFunctionTypeChange,

		// Constants for validation
		constraints: {
			minPopulationSize: MIN_POPULATION_SIZE,
			maxPopulationSize: MAX_POPULATION_SIZE,
			minGenerations: MIN_GENERATIONS,
			maxGenerations: MAX_GENERATIONS,
		},
	};
}
