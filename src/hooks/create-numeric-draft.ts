import { type Accessor, createEffect, createSignal } from "solid-js";

interface NumericDraftOptions {
	value: Accessor<number>;
	validate: (value: number) => boolean;
	onCommit: (value: number) => void;
	disabled?: Accessor<boolean>;
	sync?: boolean;
}

export function createNumericDraft(options: NumericDraftOptions) {
	const [draft, setDraft] = createSignal(String(options.value()));
	const invalid = () =>
		draft().trim() === "" || !options.validate(Number(draft()));
	const cancel = () => setDraft(String(options.value()));
	const commit = () => {
		if (options.disabled?.() || invalid()) return;
		options.onCommit(Number(draft()));
		cancel();
	};
	if (options.sync !== false) createEffect(cancel);
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			commit();
		}
		if (event.key === "Escape") cancel();
	};
	return { draft, setDraft, invalid, cancel, commit, onKeyDown };
}

export const isIntegerInRange = (value: number, min: number, max: number) =>
	Number.isInteger(value) && value >= min && value <= max;
