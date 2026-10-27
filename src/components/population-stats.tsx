import type { Individual } from "../genetic-algorithm";

interface PopulationStatsProps {
	generation: number;
	averageFitness: number;
	bestIndividual: Individual | null;
}

const formatFitness = (value: number) =>
	value !== 0 && (Math.abs(value) < 0.0001 || Math.abs(value) >= 10_000)
		? value.toExponential(3)
		: value.toFixed(4);

export function PopulationStats(props: PopulationStatsProps) {
	return (
		<dl class="stats" aria-label="集団の統計">
			<div class="stat-item best-individual">
				<dt class="label">最良評価値</dt>
				{props.bestIndividual ? (
					<>
						<dd
							class="value fitness-value"
							title={`評価値: ${props.bestIndividual.fitness}`}
						>
							{formatFitness(props.bestIndividual.fitness)}
						</dd>
						<dd class="coordinate-display">
							<span>座標</span>
							<span
								class="coord-value"
								title={`座標: (${props.bestIndividual.x}, ${props.bestIndividual.y})`}
							>
								({props.bestIndividual.x.toFixed(3)},{" "}
								{props.bestIndividual.y.toFixed(3)})
							</span>
						</dd>
					</>
				) : (
					<dd class="value no-data">データなし</dd>
				)}
			</div>
			<div class="stat-item average-fitness">
				<dt class="label">平均評価値</dt>
				<dd class="value" title={`平均評価値: ${props.averageFitness}`}>
					{formatFitness(props.averageFitness)}
				</dd>
			</div>
			<div class="stat-item generation-stat">
				<dt class="label">世代</dt>
				<dd class="value">{props.generation}</dd>
			</div>
		</dl>
	);
}
