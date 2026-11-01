import { createEffect, createSignal, createUniqueId, on, Show } from "solid-js";

interface GenerationHistoryProps {
	generation: number;
	latestGeneration: number;
	onSelect: (generation: number) => void;
	onShowLatest: () => void;
}

export function GenerationHistory(props: GenerationHistoryProps) {
	const id = createUniqueId();
	const [draft, setDraft] = createSignal(String(props.generation));
	const [isEditing, setIsEditing] = createSignal(false);
	const invalidDraft = () =>
		draft().trim() === "" ||
		!Number.isInteger(Number(draft())) ||
		Number(draft()) < 0 ||
		Number(draft()) > props.latestGeneration;
	const cancelDraft = () => {
		setIsEditing(false);
		setDraft(String(props.generation));
	};
	createEffect(
		on(
			() => [props.generation, props.latestGeneration],
			() => {
				if (!isEditing() || props.latestGeneration === 0) cancelDraft();
			},
		),
	);
	const commitDraft = () => {
		setIsEditing(false);
		if (invalidDraft()) return;
		props.onSelect(Number(draft()));
		setDraft(String(props.generation));
	};
	const selectGeneration = (input: HTMLInputElement) => {
		const value = input.valueAsNumber;
		if (!Number.isFinite(value)) return;
		const generation = Math.max(
			0,
			Math.min(props.latestGeneration, Math.round(value)),
		);
		setIsEditing(false);
		props.onSelect(generation);
		setDraft(String(generation));
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
						inputmode="numeric"
						min={0}
						max={props.latestGeneration}
						step={1}
						value={draft()}
						disabled={props.latestGeneration === 0}
						aria-invalid={invalidDraft()}
						aria-describedby={
							invalidDraft() ? `${id}-help ${id}-error` : `${id}-help`
						}
						onFocus={() => setIsEditing(true)}
						onInput={(event) => {
							setIsEditing(true);
							setDraft(event.currentTarget.value);
						}}
						onBlur={commitDraft}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								commitDraft();
							}
							if (event.key === "Escape") cancelDraft();
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
					onClick={() => {
						cancelDraft();
						props.onShowLatest();
					}}
				>
					最新世代に戻る
				</button>
			</div>
			<Show when={invalidDraft()}>
				<p class="field-error" id={`${id}-error`}>
					0〜{props.latestGeneration}の整数を入力してください。
				</p>
			</Show>
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
