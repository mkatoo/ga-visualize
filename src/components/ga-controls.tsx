import { ControlPanel } from "../control-panel";
import { FitnessChart } from "../fitness-chart";
import type { Statistics } from "../genetic-algorithm";
import type { FunctionType } from "../objective-functions";
import { ProgressDisplay } from "../progress-display";

interface GAControlsProps {
	isRunning: boolean;
	functionType: FunctionType;
	populationSize: number;
	generations: number;
	animationSpeed: number;
	statistics: Statistics;
	onStart: () => void;
	onStop: () => void;
	onStep: () => void;
	onReset: () => void;
	onFunctionTypeChange: (event: Event) => void;
	onPopulationSizeChange: (event: Event) => void;
	onPopulationSizeBlur: (event: Event) => void;
	onGenerationsChange: (event: Event) => void;
	onGenerationsBlur: (event: Event) => void;
	onSpeedChange: (event: Event) => void;
	constraints: {
		minPopulationSize: number;
		maxPopulationSize: number;
		minGenerations: number;
		maxGenerations: number;
	};
}

export function GAControls(props: GAControlsProps) {
	return (
		<div class="control-panel">
			<ControlPanel
				isRunning={props.isRunning}
				functionType={props.functionType}
				populationSize={props.populationSize}
				generations={props.generations}
				animationSpeed={props.animationSpeed}
				onStart={props.onStart}
				onStop={props.onStop}
				onStep={props.onStep}
				onReset={props.onReset}
				onFunctionTypeChange={props.onFunctionTypeChange}
				onPopulationSizeChange={props.onPopulationSizeChange}
				onPopulationSizeBlur={props.onPopulationSizeBlur}
				onGenerationsChange={props.onGenerationsChange}
				onGenerationsBlur={props.onGenerationsBlur}
				onSpeedChange={props.onSpeedChange}
				minPopulationSize={props.constraints.minPopulationSize}
				maxPopulationSize={props.constraints.maxPopulationSize}
				minGenerations={props.constraints.minGenerations}
				maxGenerations={props.constraints.maxGenerations}
			/>

			<ProgressDisplay
				currentGeneration={props.statistics.generation}
				totalGenerations={props.generations}
			/>

			<FitnessChart
				bestFitness={props.statistics.bestFitness}
				averageFitness={props.statistics.averageFitness}
				totalGenerations={props.generations}
			/>
		</div>
	);
}
