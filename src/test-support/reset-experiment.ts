import { fireEvent, type render, within } from "@solidjs/testing-library";

export function openResetConfirmation(view: ReturnType<typeof render>) {
	const dialog = view.container.querySelector("dialog");
	if (!dialog) throw new Error("Reset confirmation dialog is missing");
	// jsdom does not implement the modal dialog methods.
	dialog.showModal = () => {
		dialog.open = true;
	};
	dialog.close = () => {
		dialog.open = false;
	};
	fireEvent.click(view.getByRole("button", { name: "実験をリセット" }));
	return within(view.getByRole("dialog", { name: "実験をリセットしますか？" }));
}

export function confirmExperimentReset(view: ReturnType<typeof render>) {
	const dialog = openResetConfirmation(view);
	fireEvent.click(dialog.getByRole("button", { name: "リセットする" }));
}
