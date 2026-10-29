import { createUniqueId, Show } from "solid-js";
import { formatFitness } from "../format-fitness";
import type { Individual } from "../genetic-algorithm";
import { VISUALIZATION_COLORS } from "../visualization-colors";

interface PopulationStatsProps {
	generation: number;
	averageFitness: number;
	bestIndividual: Individual | null;
}

export function PopulationStats(props: PopulationStatsProps) {
	const generationHeadingId = createUniqueId();
	return (
		<section class="current-generation" aria-labelledby={generationHeadingId}>
			<h3 id={generationHeadingId} class="generation-heading">
				第{props.generation}世代の結果
			</h3>
			<dl class="generation-data">
				<div class="best-individual">
					<dt class="legend-item">
						<span
							class="legend-line"
							style={{ "border-top-color": VISUALIZATION_COLORS.best }}
							aria-hidden="true"
						/>
						最良評価値
					</dt>
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
					<dt class="legend-item">
						<span
							class="legend-line"
							style={{
								"border-top-color": VISUALIZATION_COLORS.population,
								"border-top-style": "dashed",
							}}
							aria-hidden="true"
						/>
						平均評価値
					</dt>
					<dd class="value" title={`平均評価値: ${props.averageFitness}`}>
						{formatFitness(props.averageFitness)}
					</dd>
				</div>
			</dl>
		</section>
	);
}

interface BestEverStatsProps {
	generation: number;
	bestIndividual: Individual | null;
	bestGeneration: number;
}

export function BestEverStats(props: BestEverStatsProps) {
	const headingId = createUniqueId();
	const label = () => `第${props.generation}世代までの最良評価値`;
	return (
		<section class="best-ever" aria-labelledby={headingId}>
			<h3 id={headingId} class="label">
				{label()}
			</h3>
			<p class="value" title={`${label()}: ${props.bestIndividual?.fitness}`}>
				{props.bestIndividual
					? formatFitness(props.bestIndividual.fitness)
					: "データなし"}
			</p>
			<Show when={props.bestIndividual}>
				{(best) => (
					<p class="coordinate-display">
						<span>座標</span>
						<span class="coord-value">x = {best().x}</span>
						<span class="coord-value">y = {best().y}</span>
						<span>第{props.bestGeneration}世代で発見</span>
					</p>
				)}
			</Show>
		</section>
	);
}
