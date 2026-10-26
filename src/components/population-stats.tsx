import type { Individual } from "../genetic-algorithm";

interface PopulationStatsProps {
	generation: number;
	averageFitness: number;
	bestIndividual: Individual | null;
}

export function PopulationStats(props: PopulationStatsProps) {
	return (
		<div class="stats">
			<div class="stat-item">
				<span class="label">世代</span>
				<span class="value">{props.generation}</span>
			</div>
			<div class="stat-item best-individual">
				<span class="label">最良個体</span>
				<div class="best-individual-details">
					{props.bestIndividual ? (
						<>
							<div class="coordinate-display">
								<span class="coord-label">座標:</span>
								<span
									class="coord-value tooltip"
									title={`座標: (${props.bestIndividual.x}, ${props.bestIndividual.y})`}
								>
									({props.bestIndividual.x.toFixed(3)},{" "}
									{props.bestIndividual.y.toFixed(3)})
								</span>
							</div>
							<div class="fitness-display">
								<span class="fitness-label">適応度:</span>
								<span
									class="fitness-value tooltip"
									title={`適応度: ${props.bestIndividual.fitness}`}
								>
									{props.bestIndividual.fitness.toFixed(4)}
								</span>
							</div>
						</>
					) : (
						<span class="no-data">データなし</span>
					)}
				</div>
			</div>
			<div class="stat-item">
				<span class="label">平均適応度</span>
				<span class="value">{props.averageFitness.toFixed(4)}</span>
			</div>
		</div>
	);
}
