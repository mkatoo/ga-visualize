import { createSignal, onCleanup } from "solid-js";
import { ControlPanel } from "./control-panel";
import { FitnessChart } from "./fitness-chart";
import { DEFAULT_CONFIG, GeneticAlgorithm } from "./genetic-algorithm";
import { type FunctionType, getObjectiveFunction } from "./objective-functions";
import { ProgressDisplay } from "./progress-display";
import { Visualizer } from "./visualizer";
import {
	DEFAULT_ANIMATION_SPEED,
	DEFAULT_FUNCTION_TYPE,
	DEFAULT_GENERATIONS,
	DEFAULT_POPULATION_SIZE,
	MAX_GENERATIONS,
	MAX_POPULATION_SIZE,
	MIN_GENERATIONS,
	MIN_POPULATION_SIZE,
} from "./constants";
import "./ga-app.css";


export function GAApp() {
	const [populationSize, setPopulationSize] = createSignal(DEFAULT_POPULATION_SIZE);
	const [generations, setGenerations] = createSignal(DEFAULT_GENERATIONS);
	const [functionType, setFunctionType] = createSignal<FunctionType>(DEFAULT_FUNCTION_TYPE);

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
	const [animationSpeed, setAnimationSpeed] = createSignal(DEFAULT_ANIMATION_SPEED);

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

	const handleSpeedChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const speed = parseInt(target.value);
		setAnimationSpeed(speed);

		if (isRunning()) {
			stop();
			start();
		}
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

	return (
		<div class="ga-app">
			<header class="header">
				<h1>遺伝的アルゴリズム可視化</h1>
				<p>最適化関数の最適化過程を可視化</p>
			</header>

			<div class="main-content">
				<div class="visualization-panel">
					<Visualizer
						population={population()}
						bounds={ga().getBounds()}
						generation={statistics().generation}
						averageFitness={
							statistics().averageFitness[
								statistics().averageFitness.length - 1
							] ?? 0
						}
						bestIndividual={statistics().currentBest}
						functionType={functionType()}
					/>
				</div>

				<div class="control-panel">
					<ControlPanel
						isRunning={isRunning()}
						functionType={functionType()}
						populationSize={populationSize()}
						generations={generations()}
						animationSpeed={animationSpeed()}
						onStart={start}
						onStop={stop}
						onStep={step}
						onReset={reset}
						onFunctionTypeChange={handleFunctionTypeChange}
						onPopulationSizeChange={handlePopulationSizeChange}
						onPopulationSizeBlur={handlePopulationSizeBlur}
						onGenerationsChange={handleGenerationsChange}
						onGenerationsBlur={handleGenerationsBlur}
						onSpeedChange={handleSpeedChange}
						minPopulationSize={MIN_POPULATION_SIZE}
						maxPopulationSize={MAX_POPULATION_SIZE}
						minGenerations={MIN_GENERATIONS}
						maxGenerations={MAX_GENERATIONS}
					/>

					<ProgressDisplay
						currentGeneration={statistics().generation}
						totalGenerations={generations()}
					/>

					<FitnessChart
						bestFitness={statistics().bestFitness}
						averageFitness={statistics().averageFitness}
						totalGenerations={generations()}
					/>
				</div>
			</div>
		</div>
	);
}
