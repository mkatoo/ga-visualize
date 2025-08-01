import { createSignal, onCleanup } from "solid-js";
import { DEFAULT_CONFIG, GeneticAlgorithm } from "./genetic-algorithm";
import {
	type FunctionType,
	getObjectiveFunction,
} from "./objective-functions";
import { Visualizer } from "./visualizer";
import { ControlPanel } from "./control-panel";
import { ProgressDisplay } from "./progress-display";
import { FitnessChart } from "./fitness-chart";
import "./ga-app.css";

const MIN_POPULATION_SIZE = 1;
const MAX_POPULATION_SIZE = 1000;
const MIN_GENERATIONS = 1;
const MAX_GENERATIONS = 1000;

export function GAApp() {
	const [populationSize, setPopulationSize] = createSignal(100);
	const [generations, setGenerations] = createSignal(50);
	const [functionType, setFunctionType] = createSignal<FunctionType>("sphere");

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
	const [animationSpeed, setAnimationSpeed] = createSignal(500);

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
