import { createUniqueId, Show } from "solid-js";

interface GenerationHistoryProps {
	generation: number;
	latestGeneration: number;
	onSelect: (generation: number) => void;
	onShowLatest: () => void;
}

export function GenerationHistory(props: GenerationHistoryProps) {
	const id = createUniqueId();
	const selectGeneration = (input: HTMLInputElement) => {
		const value = input.valueAsNumber;
		if (!Number.isFinite(value)) return;
		const generation = Math.max(
			0,
			Math.min(props.latestGeneration, Math.round(value)),
		);
		props.onSelect(generation);
		input.value = String(generation);
	};
	return (
		<section class="generation-history" aria-label="世代の履歴">
			<div class="generation-controls">
				<label class="generation-selection" for={`${id}-generation`}>
					<span>表示世代</span>
					<input
						id={`${id}-generation`}
						type="number"
						min={0}
						max={props.latestGeneration}
						step={1}
						value={props.generation}
						disabled={props.latestGeneration === 0}
						aria-describedby={`${id}-help`}
						onInput={(event) => selectGeneration(event.currentTarget)}
						onBlur={(event) => {
							event.currentTarget.value = String(props.generation);
						}}
					/>
					<span class="generation-latest" aria-hidden="true">
						/ {props.latestGeneration}
					</span>
				</label>
				<input
					class="generation-range"
					type="range"
					min={0}
					max={props.latestGeneration}
					step={1}
					value={props.generation}
					disabled={props.latestGeneration === 0}
					aria-label="表示世代のスライダー"
					aria-describedby={`${id}-help`}
					aria-valuetext={`第${props.generation}世代、最新は第${props.latestGeneration}世代`}
					onInput={(event) => selectGeneration(event.currentTarget)}
				/>
				<button
					type="button"
					class="btn btn-secondary"
					disabled={props.generation === props.latestGeneration}
					onClick={props.onShowLatest}
				>
					最新世代に戻る
				</button>
			</div>
			<p id={`${id}-help`}>
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
