import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
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
	onPopulationSizeBlur: (event: Event) => void;
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
	const [populationDraft, setPopulationDraft] = createSignal(
		String(props.populationSize),
	);
	const [generationsDraft, setGenerationsDraft] = createSignal(
		String(props.generations),
	);
	createEffect(() => setPopulationDraft(String(props.populationSize)));
	createEffect(() => setGenerationsDraft(String(props.generations)));
	const validNumber = (value: string, min: number, max: number) =>
		value.trim() !== "" &&
		Number.isInteger(Number(value)) &&
		Number(value) >= min &&
		Number(value) <= max;
	const invalidPopulation = () =>
		!validNumber(
			populationDraft(),
			props.minPopulationSize,
			props.maxPopulationSize,
		);
	const invalidGenerations = () =>
		!validNumber(
			generationsDraft(),
			props.minGenerations,
			props.maxGenerations,
		);
	const invalidSettings = () => invalidPopulation() || invalidGenerations();
	const commitPopulation = (event: Event) => {
		if (!invalidPopulation()) {
			props.onPopulationSizeBlur(event);
			setPopulationDraft(String(props.populationSize));
		}
	};
	const commitGenerations = (event: Event) => {
		if (!invalidGenerations()) {
			props.onGenerationsBlur(event);
			setGenerationsDraft(String(props.generations));
		}
	};
	let settings!: HTMLDetailsElement;
	const focusInvalidSetting = () => {
		settings.open = true;
		settings
			.querySelector<HTMLInputElement>('input[aria-invalid="true"]')
			?.focus();
	};
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
					aria-describedby={
						invalidSettings() ? "run-settings-error" : undefined
					}
					disabled={!props.isRunning && invalidSettings()}
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
						invalidSettings() ? "run-settings-error" : undefined
					}
					onClick={props.onStep}
					disabled={
						props.isRunning ||
						props.runStatus === "completed" ||
						invalidSettings()
					}
				>
					{props.isViewingHistory ? "最新から1世代進める" : "1世代進める"}
				</button>
				<button
					type="button"
					class="btn btn-text"
					onClick={() => {
						setPopulationDraft(String(props.populationSize));
						setGenerationsDraft(String(props.generations));
						props.onReset();
					}}
				>
					リセット
				</button>
				<Show when={invalidSettings()}>
					<div class="run-settings-error">
						<output id="run-settings-error">入力エラーがあります。</output>
						<button
							type="button"
							class="btn btn-text"
							onClick={focusInvalidSetting}
						>
							設定を確認
						</button>
					</div>
				</Show>
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
					<span class="settings-title">
						実験設定
						<Show when={invalidSettings()}>
							<span class="settings-error-badge">入力エラー</span>
						</Show>
					</span>
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
								aria-describedby="function-description"
								value={props.functionType}
								onChange={props.onFunctionTypeChange}
								disabled={props.settingsLocked}
							>
								{Object.entries(OBJECTIVE_FUNCTIONS).map(([key, func]) => (
									<option value={key}>{func.name}</option>
								))}
							</select>
							<p id="function-description" class="function-description">
								{OBJECTIVE_FUNCTIONS[props.functionType].description}
							</p>
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
								value={populationDraft()}
								onInput={(event) =>
									setPopulationDraft(event.currentTarget.value)
								}
								onBlur={commitPopulation}
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										event.preventDefault();
										commitPopulation(event);
									}
									if (event.key === "Escape")
										setPopulationDraft(String(props.populationSize));
								}}
								aria-invalid={invalidPopulation()}
								aria-describedby={
									invalidPopulation() ? "population-error" : undefined
								}
								disabled={props.settingsLocked}
							/>
							<Show when={invalidPopulation()}>
								<p id="population-error" class="field-error">
									{props.minPopulationSize}〜{props.maxPopulationSize}
									の整数を入力してください。
								</p>
							</Show>
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
								value={generationsDraft()}
								onInput={(event) =>
									setGenerationsDraft(event.currentTarget.value)
								}
								onBlur={commitGenerations}
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										event.preventDefault();
										commitGenerations(event);
									}
									if (event.key === "Escape")
										setGenerationsDraft(String(props.generations));
								}}
								aria-invalid={invalidGenerations()}
								aria-describedby={
									invalidGenerations() ? "generations-error" : undefined
								}
								disabled={props.settingsLocked}
							/>
							<Show when={invalidGenerations()}>
								<p id="generations-error" class="field-error">
									{props.minGenerations}〜{props.maxGenerations}
									の整数を入力してください。
								</p>
							</Show>
						</div>
					</div>
				</div>
			</details>
		</div>
	);
}
