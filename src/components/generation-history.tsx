import { Show } from "solid-js";

interface GenerationHistoryProps {
	generation: number;
	latestGeneration: number;
	onSelect: (generation: number) => void;
	onShowLatest: () => void;
}

export function GenerationHistory(props: GenerationHistoryProps) {
	return (
		<section class="generation-history" aria-label="世代の履歴">
			<div class="history-header">
				<label for="history-generation">
					表示する世代: {props.generation} / {props.latestGeneration}
				</label>
				<button
					type="button"
					class="btn btn-secondary"
					disabled={props.generation === props.latestGeneration}
					onClick={props.onShowLatest}
				>
					最新世代に戻る
				</button>
			</div>
			<input
				id="history-generation"
				type="range"
				min={0}
				max={props.latestGeneration}
				step={1}
				value={props.generation}
				disabled={props.latestGeneration === 0}
				aria-valuetext={`第${props.generation}世代、最新は第${props.latestGeneration}世代`}
				onInput={(event) => props.onSelect(event.currentTarget.valueAsNumber)}
			/>
			<p>
				<Show
					when={props.generation < props.latestGeneration}
					fallback="世代を選ぶと一時停止し、その世代の分布と評価値を表示します。"
				>
					第{props.generation}
					世代の履歴を表示しています。探索を続行する場合は、最新の第
					{props.latestGeneration}世代から続けます。
				</Show>
			</p>
		</section>
	);
}
