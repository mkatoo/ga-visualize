import {
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { MAX_ANIMATION_INTERVAL, MIN_ANIMATION_INTERVAL } from "./constants";
import {
	DEFAULT_GA_PARAMETERS,
	GA_PARAMETER_FIELDS,
	type GAParameterName,
	type GAParameters,
	isValidGAParameter,
} from "./ga-parameters";
import type { RunStatus } from "./hooks/use-genetic-algorithm";
import type { FunctionType } from "./objective-functions";
import { OBJECTIVE_FUNCTIONS } from "./objective-functions";
import { ProgressDisplay } from "./progress-display";

interface ControlPanelProps {
	// Control states
	isRunning: boolean;
	isViewingHistory: boolean;
	runStatus: RunStatus;
	currentGeneration: number;
	onRestart: () => void;
	functionType: FunctionType;
	populationSize: number;
	generations: number;
	parameters: GAParameters;
	animationSpeed: number;
	settingsLocked: boolean;

	// Event handlers
	onStart: () => void;
	onStop: () => void;
	onStep: () => void;
	onReset: () => void;
	onResetParameters: () => void;
	onParameterChange: (name: GAParameterName, value: number) => void;
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
	const parameterFields = GA_PARAMETER_FIELDS.map((field) => {
		const value = createMemo(() => props.parameters[field.key]);
		const [draft, setDraft] = createSignal(String(value()));
		createEffect(() => setDraft(String(value())));
		const invalid = () =>
			draft().trim() === "" || !isValidGAParameter(field.key, Number(draft()));
		const cancel = () => setDraft(String(value()));
		const commit = () => {
			if (props.settingsLocked || invalid()) return;
			props.onParameterChange(field.key, Number(draft()));
			cancel();
		};
		return { ...field, draft, setDraft, invalid, cancel, commit };
	});
	const invalidParameters = () =>
		parameterFields.some((field) => field.invalid());
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
	const invalidSettings = () =>
		invalidPopulation() || invalidGenerations() || invalidParameters();
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
	let runControls!: HTMLFieldSetElement;
	const focusInvalidSetting = () => {
		settings.open = true;
		const input = settings.querySelector<HTMLInputElement>(
			'input[aria-invalid="true"]',
		);
		const details = input?.closest("details");
		if (details) details.open = true;
		input?.focus();
	};
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
	const handleLayoutChange = (event: MediaQueryListEvent) => {
		settings.open = !event.matches;
		updateControlsHeight();
	};
	onMount(() => {
		if (typeof window.matchMedia !== "function") return;
		mobileQuery = window.matchMedia("(max-width: 1024px)");
		settings.open = !mobileQuery.matches;
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
		<div class="controls">
			<fieldset class="button-group" aria-label="実行操作" ref={runControls}>
				<ProgressDisplay
					status={props.runStatus}
					animationSpeed={props.animationSpeed}
					currentGeneration={props.currentGeneration}
					totalGenerations={props.generations}
				/>
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
						for (const field of parameterFields) field.cancel();
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
					<details class="advanced-settings">
						<summary class="settings-toggle">
							<span class="settings-title">
								詳細設定
								<Show when={invalidParameters()}>
									<span class="settings-error-badge">入力エラー</span>
								</Show>
							</span>
						</summary>
						<div class="parameter-controls advanced-settings-content">
							{parameterFields.map((field) => (
								<div class="parameter-group">
									<label for={`ga-${field.key}`}>
										{field.label} ({field.min}〜{field.max})
									</label>
									<input
										id={`ga-${field.key}`}
										type="number"
										inputmode={field.integer ? "numeric" : "decimal"}
										min={field.min}
										max={field.max}
										step={field.integer ? 1 : "any"}
										value={field.draft()}
										onInput={(event) =>
											field.setDraft(event.currentTarget.value)
										}
										onBlur={field.commit}
										onKeyDown={(event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												field.commit();
											}
											if (event.key === "Escape") field.cancel();
										}}
										disabled={props.settingsLocked}
										aria-invalid={field.invalid()}
										aria-describedby={
											field.invalid()
												? `ga-${field.key}-help ga-${field.key}-error`
												: `ga-${field.key}-help`
										}
									/>
									<p id={`ga-${field.key}-help`} class="parameter-description">
										{field.description} 初期値:{" "}
										{DEFAULT_GA_PARAMETERS[field.key]}
									</p>
									<Show when={field.invalid()}>
										<p id={`ga-${field.key}-error`} class="field-error">
											{field.min}〜{field.max}の
											{field.integer ? "整数" : "数値"}を入力してください。
										</p>
									</Show>
								</div>
							))}
							<button
								type="button"
								class="btn btn-secondary"
								disabled={props.settingsLocked}
								onClick={() => {
									props.onResetParameters();
									for (const field of parameterFields) field.cancel();
								}}
							>
								詳細設定を初期値に戻す
							</button>
						</div>
					</details>
				</div>
			</details>
		</div>
	);
}
