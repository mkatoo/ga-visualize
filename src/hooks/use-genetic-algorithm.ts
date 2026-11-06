import { batch, createMemo, createSignal, onCleanup } from "solid-js";
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
import { DEFAULT_CONFIG, GeneticAlgorithm } from "../genetic-algorithm";
import {
	type FunctionType,
	getObjectiveFunction,
} from "../objective-functions";

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
	const getBoundsForFunction = (type: FunctionType) => {
		return getObjectiveFunction(type).bounds;
	};

	const [ga, setGA] = createSignal(
		new GeneticAlgorithm({
			...DEFAULT_CONFIG,
			...parameters(),
			populationSize: populationSize(),
			generations: generations(),
			functionType: functionType(),
			bounds: getBoundsForFunction(functionType()),
		}),
	);
	const [population, setPopulation] = createSignal(ga().getPopulation());
	const [statistics, setStatistics] = createSignal(ga().getStatistics());
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

	let timerId: number | null = null;
	let lastGenerationAt = 0;

	const initializeGA = () => {
		setSelectedGeneration(null);
		setHasStarted(false);
		ga().initializePopulation();
		setPopulation(ga().getPopulation());
		setStatistics(ga().getStatistics());
	};

	const step = () => {
		setSelectedGeneration(null);
		setHasStarted(true);
		const canContinue = ga().evolve();
		setPopulation(ga().getPopulation());
		setStatistics(ga().getStatistics());

		if (!canContinue || ga().getGeneration() >= generations()) {
			stop();
		}
	};

	const scheduleNextGeneration = () => {
		if (timerId !== null) clearTimeout(timerId);
		const elapsed = Date.now() - lastGenerationAt;
		timerId = window.setTimeout(
			() => {
				timerId = null;
				if (!isRunning()) return;
				step();
				lastGenerationAt = Date.now();
				if (isRunning()) scheduleNextGeneration();
			},
			Math.max(0, animationSpeed() - elapsed),
		);
	};

	const start = () => {
		if (isRunning() || ga().getGeneration() >= generations()) return;

		setHasStarted(true);
		setIsRunning(true);
		setSelectedGeneration(null);
		lastGenerationAt = Date.now();
		scheduleNextGeneration();
	};

	const stop = () => {
		setIsRunning(false);
		if (timerId !== null) {
			clearTimeout(timerId);
			timerId = null;
		}
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
			setGA(
				new GeneticAlgorithm({
					...DEFAULT_CONFIG,
					...parameters(),
					populationSize: populationSize(),
					generations: generations(),
					functionType: functionType(),
					bounds: getBoundsForFunction(functionType()),
				}),
			);
			initializeGA();
		});
	};

	const validateAndSetPopulationSize = (value: string) => {
		if (settingsLocked()) return populationSize();
		const parsed = value.trim() === "" ? Number.NaN : Number(value);
		const numValue = Number.isInteger(parsed) ? parsed : populationSize();
		const clampedValue = Math.max(
			MIN_POPULATION_SIZE,
			Math.min(MAX_POPULATION_SIZE, numValue),
		);
		if (clampedValue === populationSize()) return clampedValue;

		setPopulationSize(clampedValue);
		updateGAConfig();

		return clampedValue;
	};

	const validateAndSetGenerations = (value: string) => {
		if (settingsLocked()) return generations();
		const parsed = value.trim() === "" ? Number.NaN : Number(value);
		const numValue = Number.isInteger(parsed) ? parsed : generations();
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

		if (isRunning()) scheduleNextGeneration();
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

	const handlePopulationSizeChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (target.value === "") return;
		validateAndSetPopulationSize(target.value);
	};

	const handlePopulationSizeBlur = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const clampedValue = validateAndSetPopulationSize(target.value);
		target.value = clampedValue.toString();
	};

	const handleGenerationsChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (target.value === "") return;
		validateAndSetGenerations(target.value);
	};

	const handleGenerationsBlur = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const clampedValue = validateAndSetGenerations(target.value);
		target.value = clampedValue.toString();
	};

	const handleFunctionTypeChange = (event: Event) => {
		if (settingsLocked()) return;
		const target = event.target as HTMLSelectElement;
		const newFunctionType = target.value as FunctionType;
		if (newFunctionType === functionType()) return;
		setFunctionType(newFunctionType);
		updateGAConfig();
	};

	onCleanup(() => {
		if (timerId !== null) clearTimeout(timerId);
	});

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

		// Event handlers
		handleSpeedChange,
		handleParameterChange,
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
