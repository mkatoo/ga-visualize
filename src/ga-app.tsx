import { createSignal, onCleanup, onMount } from "solid-js";
import { GAVisualization } from "./components/ga-visualization";
import { GenerationHistory } from "./components/generation-history";
import { RunControls } from "./components/run-controls";
import { ControlPanel } from "./control-panel";
import { FitnessChart } from "./fitness-chart";
import { createExperimentSettings } from "./hooks/create-experiment-settings";
import { useGeneticAlgorithm } from "./hooks/use-genetic-algorithm";
import { EASE_OUT_CSS } from "./motion";
import { VISUALIZATION_COLORS } from "./visualization-colors";
import "./ga-app.css";

export function GAApp() {
	let root!: HTMLDivElement;
	const [inputMethod, setInputMethod] = createSignal<"pointer" | "keyboard">(
		"keyboard",
	);
	const handlePointer = () => setInputMethod("pointer");
	const handleKey = () => setInputMethod("keyboard");
	onMount(() => {
		root.addEventListener("pointerdown", handlePointer, true);
		root.addEventListener("keydown", handleKey, true);
	});
	onCleanup(() => {
		root.removeEventListener("pointerdown", handlePointer, true);
		root.removeEventListener("keydown", handleKey, true);
	});
	const {
		populationSize,
		generations,
		parameters,
		functionType,
		ga,
		statistics,
		displayedGeneration,
		displayedSnapshot,
		isViewingHistory,
		selectGeneration,
		showLatest,
		isRunning,
		settingsLocked,
		runStatus,
		restart,
		animationSpeed,
		start,
		stop,
		step,
		reset,
		resetParameters,
		handleParameterChange,
		handleSpeedChange,
		changePopulationSize,
		changeGenerations,
		changeFunctionType,
		constraints,
	} = useGeneticAlgorithm();

	const drafts = createExperimentSettings({
		get populationSize() {
			return populationSize();
		},
		get generations() {
			return generations();
		},
		get parameters() {
			return parameters();
		},
		get settingsLocked() {
			return settingsLocked();
		},
		constraints,
		onPopulationSizeChange: changePopulationSize,
		onGenerationsChange: changeGenerations,
		onParameterChange: handleParameterChange,
	});

	return (
		<div
			ref={root}
			class="ga-app"
			data-input-method={inputMethod()}
			style={{
				"--ease-out": EASE_OUT_CSS,
				"--color-best": VISUALIZATION_COLORS.best,
				"--color-population": VISUALIZATION_COLORS.population,
			}}
		>
			<header class="header">
				<h1>遺伝的アルゴリズム可視化</h1>
				<p>目的関数の最適化過程を可視化</p>
			</header>

			<div class="main-content">
				<div class="control-panel">
					<ControlPanel
						drafts={drafts}
						functionType={functionType()}
						populationSize={populationSize()}
						generations={generations()}
						settingsLocked={settingsLocked()}
						onResetParameters={resetParameters}
						onFunctionTypeChange={changeFunctionType}
						minPopulationSize={constraints.minPopulationSize}
						maxPopulationSize={constraints.maxPopulationSize}
						minGenerations={constraints.minGenerations}
						maxGenerations={constraints.maxGenerations}
					/>
				</div>
				<div class="visualization-workspace">
					<GAVisualization
						population={displayedSnapshot().population}
						bounds={ga().getBounds()}
						generation={displayedSnapshot().generation}
						averageFitness={displayedSnapshot().averageFitness}
						bestIndividual={displayedSnapshot().currentBest}
						bestEver={displayedSnapshot().bestEver}
						bestEverGeneration={displayedSnapshot().bestEverGeneration}
						functionType={functionType()}
						chart={
							<FitnessChart
								selectedGeneration={displayedGeneration()}
								onSelectGeneration={selectGeneration}
								bestFitness={statistics().bestFitness}
								averageFitness={statistics().averageFitness}
								totalGenerations={generations()}
							/>
						}
					>
						<RunControls
							isRunning={isRunning()}
							isViewingHistory={isViewingHistory()}
							runStatus={runStatus()}
							currentGeneration={statistics().generation}
							generations={generations()}
							animationSpeed={animationSpeed()}
							invalidSettings={drafts.invalidSettings()}
							onFocusInvalidSetting={drafts.focusInvalidSetting}
							onStart={start}
							onStop={stop}
							onStep={step}
							onRestart={restart}
							onReset={() => {
								drafts.cancelDrafts();
								reset();
							}}
							onSpeedChange={handleSpeedChange}
						/>
						<GenerationHistory
							generation={displayedGeneration()}
							latestGeneration={statistics().generation}
							onSelect={selectGeneration}
							onShowLatest={showLatest}
						/>
					</GAVisualization>
				</div>
			</div>
		</div>
	);
}
