import { type Accessor, onCleanup } from "solid-js";

interface GenerationTimerOptions {
	interval: Accessor<number>;
	isRunning: Accessor<boolean>;
	onGeneration: () => void;
}

export function createGenerationTimer(options: GenerationTimerOptions) {
	let timerId: number | null = null;
	let lastGenerationAt = 0;
	const cancel = () => {
		if (timerId !== null) {
			clearTimeout(timerId);
			timerId = null;
		}
	};
	const schedule = () => {
		cancel();
		const elapsed = Date.now() - lastGenerationAt;
		timerId = window.setTimeout(
			() => {
				timerId = null;
				if (!options.isRunning()) return;
				options.onGeneration();
				lastGenerationAt = Date.now();
				if (options.isRunning()) schedule();
			},
			Math.max(0, options.interval() - elapsed),
		);
	};
	const start = () => {
		lastGenerationAt = Date.now();
		schedule();
	};
	onCleanup(cancel);
	return { start, cancel, reschedule: schedule };
}
