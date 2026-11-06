import { ControlPanel } from "../control-panel";
import type { GAParameterName, GAParameters } from "../ga-parameters";
import type { Statistics } from "../genetic-algorithm";
import type { RunStatus } from "../hooks/use-genetic-algorithm";
import type { FunctionType } from "../objective-functions";

interface GAControlsProps {
	isRunning: boolean;
	isViewingHistory: boolean;
	runStatus: RunStatus;
	onRestart: () => void;
	functionType: FunctionType;
	populationSize: number;
	generations: number;
	parameters: GAParameters;
	animationSpeed: number;
	settingsLocked: boolean;
	statistics: Statistics;
	onStart: () => void;
	onStop: () => void;
	onStep: () => void;
	onReset: () => void;
	onResetParameters: () => void;
	onParameterChange: (name: GAParameterName, value: number) => void;
	onFunctionTypeChange: (event: Event) => void;
	onPopulationSizeBlur: (event: Event) => void;
	onGenerationsBlur: (event: Event) => void;
	onSpeedChange: (interval: number) => void;
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
				isViewingHistory={props.isViewingHistory}
				runStatus={props.runStatus}
				currentGeneration={props.statistics.generation}
				onRestart={props.onRestart}
				functionType={props.functionType}
				populationSize={props.populationSize}
				generations={props.generations}
				parameters={props.parameters}
				animationSpeed={props.animationSpeed}
				settingsLocked={props.settingsLocked}
				onStart={props.onStart}
				onStop={props.onStop}
				onStep={props.onStep}
				onReset={props.onReset}
				onResetParameters={props.onResetParameters}
				onParameterChange={props.onParameterChange}
				onFunctionTypeChange={props.onFunctionTypeChange}
				onPopulationSizeBlur={props.onPopulationSizeBlur}
				onGenerationsBlur={props.onGenerationsBlur}
				onSpeedChange={props.onSpeedChange}
				minPopulationSize={props.constraints.minPopulationSize}
				maxPopulationSize={props.constraints.maxPopulationSize}
				minGenerations={props.constraints.minGenerations}
				maxGenerations={props.constraints.maxGenerations}
			/>
		</div>
	);
}
