import { GAControls } from "./components/ga-controls";
import { GAVisualization } from "./components/ga-visualization";
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
		population,
		statistics,
		isRunning,
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
				<p>最適化関数の最適化過程を可視化</p>
			</header>

			<div class="main-content">
				<GAControls
					isRunning={isRunning()}
					functionType={functionType()}
					populationSize={populationSize()}
					generations={generations()}
					animationSpeed={animationSpeed()}
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
