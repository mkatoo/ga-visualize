import { type JSX, Show } from "solid-js";
import type { NumericDraft } from "../hooks/create-numeric-draft";

interface NumericSettingFieldProps {
	id: string;
	label: JSX.Element;
	draft: NumericDraft;
	min: number;
	max: number;
	step?: number | "any";
	disabled: boolean;
	description?: JSX.Element;
	errorId?: string;
	errorMessage: JSX.Element;
}

export function NumericSettingField(props: NumericSettingFieldProps) {
	const errorId = () => props.errorId ?? `${props.id}-error`;
	const descriptionId = () =>
		props.description ? `${props.id}-help` : undefined;
	const describedBy = () =>
		[descriptionId(), props.draft.invalid() ? errorId() : undefined]
			.filter(Boolean)
			.join(" ") || undefined;
	return (
		<div class="parameter-group">
			<label for={props.id}>{props.label}</label>
			<input
				id={props.id}
				type="number"
				inputmode={props.step === "any" ? "decimal" : "numeric"}
				min={props.min}
				max={props.max}
				step={props.step}
				value={props.draft.draft()}
				onInput={(event) => props.draft.setDraft(event.currentTarget.value)}
				onBlur={props.draft.commit}
				onKeyDown={props.draft.onKeyDown}
				disabled={props.disabled}
				aria-invalid={props.draft.invalid()}
				aria-describedby={describedBy()}
			/>
			<Show when={props.description}>
				<p id={descriptionId()} class="parameter-description">
					{props.description}
				</p>
			</Show>
			<Show when={props.draft.invalid()}>
				<p id={errorId()} class="field-error">
					{props.errorMessage}
				</p>
			</Show>
		</div>
	);
}
