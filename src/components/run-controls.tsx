import { onCleanup, onMount, Show } from "solid-js";
import type { RunStatus } from "../hooks/use-genetic-algorithm";
import { ProgressDisplay } from "../progress-display";
import { SpeedControl } from "./speed-control";

interface RunControlsProps {
	isRunning: boolean;
	isViewingHistory: boolean;
	runStatus: RunStatus;
	currentGeneration: number;
	generations: number;
	animationSpeed: number;
	invalidSettings: boolean;
	onStart: () => void;
	onStop: () => void;
	onStep: () => void;
	onRestart: () => void;
	onReset: () => void;
	onFocusInvalidSetting: () => void;
	onSpeedChange: (value: number) => void;
}

export function RunControls(props: RunControlsProps) {
	let runControls!: HTMLDivElement;
	let mobileQuery: MediaQueryList | undefined;
	let controlsObserver: ResizeObserver | undefined;
	const updateControlsHeight = () => {
		if (!mobileQuery?.matches) {
			document.documentElement.style.removeProperty("--run-controls-height");
			return;
		}
		const height = runControls.getBoundingClientRect().height;
		if (height > 0) {
			document.documentElement.style.setProperty(
				"--run-controls-height",
				`${Math.ceil(height)}px`,
			);
		}
	};
	const handleLayoutChange = () => updateControlsHeight();
	onMount(() => {
		if (typeof window.matchMedia !== "function") return;
		mobileQuery = window.matchMedia("(max-width: 1024px)");
		mobileQuery.addEventListener("change", handleLayoutChange);
		updateControlsHeight();
		if (typeof ResizeObserver === "undefined") return;
		controlsObserver = new ResizeObserver(updateControlsHeight);
		controlsObserver.observe(runControls, { box: "border-box" });
	});
	onCleanup(() => {
		mobileQuery?.removeEventListener("change", handleLayoutChange);
		controlsObserver?.disconnect();
		document.documentElement.style.removeProperty("--run-controls-height");
	});

	return (
		<div class="run-controls" ref={runControls}>
			<fieldset class="button-group" aria-label="実行操作">
				<ProgressDisplay
					status={props.runStatus}
					animationSpeed={props.animationSpeed}
					currentGeneration={props.currentGeneration}
					totalGenerations={props.generations}
				/>
				<div class="run-buttons">
					<button
						type="button"
						class="btn btn-primary"
						aria-describedby={
							props.invalidSettings ? "run-settings-error" : undefined
						}
						disabled={!props.isRunning && props.invalidSettings}
						onClick={() => {
							if (props.isRunning) props.onStop();
							else if (props.runStatus === "completed") props.onRestart();
							else props.onStart();
						}}
					>
						{
							{
								ready: "開始",
								running: "一時停止",
								paused: props.isViewingHistory ? "最新から再開" : "再開",
								completed: "もう一度実行",
							}[props.runStatus]
						}
					</button>
					<button
						type="button"
						class="btn btn-secondary"
						aria-describedby={
							props.invalidSettings ? "run-settings-error" : undefined
						}
						onClick={props.onStep}
						disabled={
							props.isRunning ||
							props.runStatus === "completed" ||
							props.invalidSettings
						}
					>
						{props.isViewingHistory ? "最新から1世代進める" : "1世代進める"}
					</button>
					<button type="button" class="btn btn-text" onClick={props.onReset}>
						リセット
					</button>
				</div>
				<Show when={props.invalidSettings}>
					<div class="run-settings-error">
						<output id="run-settings-error">入力エラーがあります。</output>
						<button
							type="button"
							class="btn btn-text"
							onClick={props.onFocusInvalidSetting}
						>
							設定を確認
						</button>
					</div>
				</Show>
			</fieldset>
			<SpeedControl
				animationSpeed={props.animationSpeed}
				onSpeedChange={props.onSpeedChange}
			/>
		</div>
	);
}
