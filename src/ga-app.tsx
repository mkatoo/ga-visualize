import { GAControls } from "./components/ga-controls";
import { GAVisualization } from "./components/ga-visualization";
import { GenerationHistory } from "./components/generation-history";
import { FitnessChart } from "./fitness-chart";
import { useGeneticAlgorithm } from "./hooks/use-genetic-algorithm";
import { VISUALIZATION_COLORS } from "./visualization-colors";
import "./ga-app.css";

export function GAApp() {
	const {
		populationSize,
		generations,
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
		handleSpeedChange,
		handlePopulationSizeChange,
		handlePopulationSizeBlur,
		handleGenerationsChange,
		handleGenerationsBlur,
		handleFunctionTypeChange,
		constraints,
	} = useGeneticAlgorithm();

	return (
		<div
			class="ga-app"
			style={{
				"--color-best": VISUALIZATION_COLORS.best,
				"--color-population": VISUALIZATION_COLORS.population,
			}}
		>
			<header class="header">
				<h1>遺伝的アルゴリズム可視化</h1>
				<p>目的関数の最適化過程を可視化</p>
			</header>

			<div class="main-content">
				<GAControls
					isRunning={isRunning()}
					isViewingHistory={isViewingHistory()}
					runStatus={runStatus()}
					onRestart={restart}
					functionType={functionType()}
					populationSize={populationSize()}
					generations={generations()}
					animationSpeed={animationSpeed()}
					settingsLocked={settingsLocked()}
					statistics={statistics()}
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
					constraints={constraints}
				/>
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
