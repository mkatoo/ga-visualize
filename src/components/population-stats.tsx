import { createUniqueId } from "solid-js";
import type { Individual } from "../genetic-algorithm";

interface PopulationStatsProps {
	generation: number;
	averageFitness: number;
	bestIndividual: Individual | null;
	bestEver?: Individual | null;
	bestEverGeneration?: number;
}

const formatFitness = (value: number) =>
	value !== 0 && (Math.abs(value) < 0.0001 || Math.abs(value) >= 10_000)
		? value.toExponential(3)
		: value.toFixed(4);

export function PopulationStats(props: PopulationStatsProps) {
	const generationHeadingId = createUniqueId();
	const bestEverLabel = () => `第${props.generation}世代までの最良評価値`;
	const bestEver = () => props.bestEver ?? props.bestIndividual;
	const bestEverFitness = () => {
		const best = bestEver();
		return best ? formatFitness(best.fitness) : "データなし";
	};
	const bestEverDescription = () => {
		const best = bestEver();
		return best
			? `座標 (${best.x.toFixed(3)}, ${best.y.toFixed(3)})・第${props.bestEverGeneration ?? props.generation}世代で発見`
			: "";
	};
	return (
		<section class="stats" aria-label="集団の統計">
			<dl class="stat-item best-ever">
				<dt class="label">{bestEverLabel()}</dt>
				<dd class="value" title={`${bestEverLabel()}: ${bestEver()?.fitness}`}>
					{bestEverFitness()}
				</dd>
				<dd class="coordinate-display">{bestEverDescription()}</dd>
			</dl>
			<section
				class="stat-item current-generation"
				aria-labelledby={generationHeadingId}
			>
				<h3 id={generationHeadingId} class="label">
					第{props.generation}世代のデータ
				</h3>
				<dl class="generation-data">
					<div class="best-individual">
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
					<div class="average-fitness">
						<dt class="label">平均評価値</dt>
						<dd class="value" title={`平均評価値: ${props.averageFitness}`}>
							{formatFitness(props.averageFitness)}
						</dd>
					</div>
				</dl>
			</section>
		</section>
	);
}
