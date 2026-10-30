import { createUniqueId, Show } from "solid-js";
import { formatFitness } from "../format-fitness";
import type { Individual } from "../genetic-algorithm";
import { VISUALIZATION_COLORS } from "../visualization-colors";

function IndividualCoordinates(props: { individual: Individual }) {
	return (
		<div class="individual-coordinates">
			<p class="coordinate-display">
				<span>座標</span>
				<span
					class="coord-value"
					title={`座標: (${props.individual.x}, ${props.individual.y})`}
				>
					({props.individual.x.toFixed(3)}, {props.individual.y.toFixed(3)})
				</span>
			</p>
			<details class="coordinate-details">
				<summary>座標の詳細</summary>
				<dl>
					<div>
						<dt>x</dt>
						<dd class="coord-value">{props.individual.x}</dd>
					</div>
					<div>
						<dt>y</dt>
						<dd class="coord-value">{props.individual.y}</dd>
					</div>
				</dl>
			</details>
		</div>
	);
}

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
							<dd class="coordinate-summary">
								<IndividualCoordinates individual={props.bestIndividual} />
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
			<h3 id={headingId} class="generation-heading">
				{label()}
			</h3>
			<div>
				<Show when={props.bestIndividual}>
					<p class="discovery-generation">第{props.bestGeneration}世代で発見</p>
				</Show>
				<p class="value" title={`${label()}: ${props.bestIndividual?.fitness}`}>
					{props.bestIndividual
						? formatFitness(props.bestIndividual.fitness)
						: "データなし"}
				</p>
				<Show when={props.bestIndividual}>
					{(best) => <IndividualCoordinates individual={best()} />}
				</Show>
			</div>
		</section>
	);
}
