import { createUniqueId, Show } from "solid-js";
import { formatFitness } from "../format-fitness";
import type { Individual } from "../genetic-algorithm";

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

interface GenerationSummaryProps {
	generation: number;
	averageFitness: number;
	bestIndividual: Individual | null;
	bestEver: Individual | null;
}

export function GenerationSummary(props: GenerationSummaryProps) {
	return (
		<section class="generation-summary" aria-label="表示中の世代の要約">
			<p class="summary-generation">第{props.generation}世代</p>
			<dl class="summary-metrics">
				<div class="best-individual">
					<dt>最良評価値</dt>
					<dd
						title={
							props.bestIndividual
								? `評価値: ${props.bestIndividual.fitness}`
								: undefined
						}
					>
						{props.bestIndividual
							? formatFitness(props.bestIndividual.fitness)
							: "—"}
					</dd>
				</div>
				<div class="average-fitness">
					<dt>平均評価値</dt>
					<dd title={`平均評価値: ${props.averageFitness}`}>
						{formatFitness(props.averageFitness)}
					</dd>
				</div>
				<div class="summary-best-ever">
					<dt>これまでの最良</dt>
					<dd
						title={
							props.bestEver
								? `これまでの最良評価値: ${props.bestEver.fitness}`
								: undefined
						}
					>
						{props.bestEver ? formatFitness(props.bestEver.fitness) : "—"}
					</dd>
				</div>
			</dl>
		</section>
	);
}

interface ResultDetailsProps {
	generation: number;
	bestIndividual: Individual | null;
	bestEver: Individual | null;
	bestEverGeneration: number;
}

export function ResultDetails(props: ResultDetailsProps) {
	const generationHeadingId = createUniqueId();
	const bestEverHeadingId = createUniqueId();
	return (
		<details class="result-details">
			<summary class="settings-toggle">
				<span class="settings-title">結果の詳細</span>
				<span class="settings-overview">座標・最良個体の発見世代</span>
			</summary>
			<div class="generation-comparison">
				<section
					class="current-generation"
					aria-labelledby={generationHeadingId}
				>
					<h3 id={generationHeadingId} class="generation-heading">
						第{props.generation}世代の最良個体
					</h3>
					<Show
						when={props.bestIndividual}
						fallback={<p class="no-data">データなし</p>}
					>
						{(best) => <IndividualCoordinates individual={best()} />}
					</Show>
				</section>
				<section class="best-ever" aria-labelledby={bestEverHeadingId}>
					<h3 id={bestEverHeadingId} class="generation-heading">
						第{props.generation}世代までの最良個体
					</h3>
					<Show
						when={props.bestEver}
						fallback={<p class="no-data">データなし</p>}
					>
						{(best) => (
							<div>
								<p class="discovery-generation">
									第{props.bestEverGeneration}世代で発見
								</p>
								<IndividualCoordinates individual={best()} />
							</div>
						)}
					</Show>
				</section>
			</div>
		</details>
	);
}
