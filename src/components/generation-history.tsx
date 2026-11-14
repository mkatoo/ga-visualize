import {
	createEffect,
	createRenderEffect,
	createSignal,
	createUniqueId,
	on,
	Show,
} from "solid-js";
import {
	createNumericDraft,
	isIntegerInRange,
} from "../hooks/create-numeric-draft";

interface GenerationHistoryProps {
	generation: number;
	latestGeneration: number;
	onSelect: (generation: number) => void;
	onShowLatest: () => void;
}

export function GenerationHistory(props: GenerationHistoryProps) {
	const id = createUniqueId();
	const field = createNumericDraft({
		value: () => props.generation,
		validate: (value) => isIntegerInRange(value, 0, props.latestGeneration),
		onCommit: (value) => props.onSelect(value),
		sync: false,
	});
	const { draft, setDraft, invalid: invalidDraft } = field;
	const [isEditing, setIsEditing] = createSignal(false);
	const cancelDraft = () => {
		setIsEditing(false);
		field.cancel();
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
		field.commit();
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
					ref={(input) => {
						createRenderEffect(() => {
							// Update the bound first so the browser cannot clamp a new generation to the old maximum.
							input.max = String(props.latestGeneration);
							input.value = String(props.generation);
						});
					}}
					class="generation-range"
					type="range"
					min={0}
					step={1}
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
