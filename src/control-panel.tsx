import { onCleanup, onMount } from "solid-js";
import type { FunctionType } from "./objective-functions";
import { OBJECTIVE_FUNCTIONS } from "./objective-functions";

interface ControlPanelProps {
	// Control states
	isRunning: boolean;
	functionType: FunctionType;
	populationSize: number;
	generations: number;
	animationSpeed: number;

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
	onSpeedChange: (event: Event) => void;

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
						else props.onStart();
					}}
				>
					{props.isRunning ? "一時停止" : "開始"}
				</button>
				<button
					type="button"
					class="btn btn-secondary"
					onClick={props.onStep}
					disabled={props.isRunning}
				>
					1世代進める
				</button>
				<button type="button" class="btn btn-text" onClick={props.onReset}>
					リセット
				</button>
			</fieldset>

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
					<div class="parameter-controls">
						<div class="parameter-group function-parameter">
							<label for="functionType">最適化関数:</label>
							<select
								id="functionType"
								value={props.functionType}
								onChange={props.onFunctionTypeChange}
								disabled={props.isRunning}
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
								disabled={props.isRunning}
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
								disabled={props.isRunning}
							/>
						</div>
					</div>

					<div class="speed-control">
						<label for="speed">アニメーション速度:</label>
						<input
							id="speed"
							type="range"
							min="50"
							max="2000"
							step="50"
							value={props.animationSpeed}
							onInput={props.onSpeedChange}
							aria-valuetext={speedLabel()}
						/>
						<span>{speedLabel()}</span>
					</div>
				</div>
			</details>
		</div>
	);
}
