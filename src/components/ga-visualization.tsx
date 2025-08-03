import type { Individual } from "../genetic-algorithm";
import type { FunctionType } from "../objective-functions";
import { Visualizer } from "../visualizer";

interface GAVisualizationProps {
	population: Individual[];
	bounds: { min: number; max: number };
	generation: number;
	averageFitness: number;
	bestIndividual: Individual | null;
	functionType: FunctionType;
}

export function GAVisualization(props: GAVisualizationProps) {
	return (
		<div class="visualization-panel">
			<Visualizer
				population={props.population}
				bounds={props.bounds}
				generation={props.generation}
				averageFitness={props.averageFitness}
				bestIndividual={props.bestIndividual}
				functionType={props.functionType}
			/>
		</div>
	);
}
