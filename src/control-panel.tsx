import { onCleanup, onMount, Show } from "solid-js";
import { MAX_ANIMATION_INTERVAL, MIN_ANIMATION_INTERVAL } from "./constants";
import type { RunStatus } from "./hooks/use-genetic-algorithm";
import type { FunctionType } from "./objective-functions";
import { OBJECTIVE_FUNCTIONS } from "./objective-functions";

interface ControlPanelProps {
	// Control states
	isRunning: boolean;
	isViewingHistory: boolean;
	runStatus: RunStatus;
	onRestart: () => void;
	functionType: FunctionType;
	populationSize: number;
	generations: number;
	animationSpeed: number;
	settingsLocked: boolean;

	// Event handlers
	onStart: () => void;
	onStop: () => void;
	onStep: () => void;
	onReset: () => void;
	onFunctionTypeChange: (event: Event) => void;
	onPopulationSizeChange: (event: Event) => void;
	onPopulationSizeBlur: (event: Event) => void;
	onGenerationsChange: (event: Event) => void;
	onGenerationsBlur: (event: Event) => void;
	onSpeedChange: (interval: number) => void;

	// Constants
	minPopulationSize: number;
	maxPopulationSize: number;
	minGenerations: number;
	maxGenerations: number;
}

export function ControlPanel(props: ControlPanelProps) {
	const speedLabel = () => `${props.animationSpeed / 1000}秒／世代`;
	let settings!: HTMLDetailsElement;
	let mobileQuery: MediaQueryList | undefined;
	const handleLayoutChange = (event: MediaQueryListEvent) => {
		settings.open = !event.matches;
	};
	onMount(() => {
		if (typeof window.matchMedia !== "function") return;
		mobileQuery = window.matchMedia("(max-width: 1024px)");
		settings.open = !mobileQuery.matches;
		mobileQuery.addEventListener("change", handleLayoutChange);
	});
	onCleanup(() => {
		mobileQuery?.removeEventListener("change", handleLayoutChange);
	});

	return (
		<div class="controls">
			<fieldset class="button-group" aria-label="実行操作">
				<button
					type="button"
					class="btn btn-primary"
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
					onClick={props.onStep}
					disabled={props.isRunning || props.runStatus === "completed"}
				>
					{props.isViewingHistory ? "最新から1世代進める" : "1世代進める"}
				</button>
				<button type="button" class="btn btn-text" onClick={props.onReset}>
					リセット
				</button>
			</fieldset>

			<div class="speed-control">
				<div class="speed-control-header">
					<label for="speed">アニメーション速度:</label>
					<span class="speed-value">{speedLabel()}</span>
				</div>
				<input
					id="speed"
					type="range"
					min={0}
					max={MAX_ANIMATION_INTERVAL - MIN_ANIMATION_INTERVAL}
					step="50"
					value={MAX_ANIMATION_INTERVAL - props.animationSpeed}
					onInput={(event) =>
						props.onSpeedChange(
							MAX_ANIMATION_INTERVAL - event.currentTarget.valueAsNumber,
						)
					}
					aria-valuetext={speedLabel()}
				/>
				<div class="speed-range-labels" aria-hidden="true">
					<span>遅い</span>
					<span>速い</span>
				</div>
			</div>

			<details class="settings-details" ref={settings} open>
				<summary class="settings-toggle">
					<span class="settings-title">実験設定</span>
					<span class="settings-overview">
						{OBJECTIVE_FUNCTIONS[props.functionType].name}・
						{props.populationSize}
						個体・{props.generations}世代
					</span>
				</summary>
				<div class="settings-content">
					<Show when={props.settingsLocked}>
						<p class="settings-help">
							設定を変更するにはリセットしてください。
						</p>
					</Show>
					<div class="parameter-controls">
						<div class="parameter-group function-parameter">
							<label for="functionType">目的関数:</label>
							<select
								id="functionType"
								value={props.functionType}
								onChange={props.onFunctionTypeChange}
								disabled={props.settingsLocked}
							>
								{Object.entries(OBJECTIVE_FUNCTIONS).map(([key, func]) => (
									<option value={key}>{func.name}</option>
								))}
							</select>
						</div>

						<div class="parameter-group">
							<label for="populationSize">
								個体数 ({props.minPopulationSize}-{props.maxPopulationSize}):
							</label>
							<input
								id="populationSize"
								type="number"
								inputmode="numeric"
								min={props.minPopulationSize}
								max={props.maxPopulationSize}
								value={props.populationSize}
								onInput={props.onPopulationSizeChange}
								onBlur={props.onPopulationSizeBlur}
								disabled={props.settingsLocked}
							/>
						</div>

						<div class="parameter-group">
							<label for="generations">
								世代数 ({props.minGenerations}-{props.maxGenerations}):
							</label>
							<input
								id="generations"
								type="number"
								inputmode="numeric"
								min={props.minGenerations}
								max={props.maxGenerations}
								value={props.generations}
								onInput={props.onGenerationsChange}
								onBlur={props.onGenerationsBlur}
								disabled={props.settingsLocked}
							/>
						</div>
					</div>
				</div>
			</details>
		</div>
	);
}
