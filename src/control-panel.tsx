import { onCleanup, onMount, Show } from "solid-js";
import { NumericSettingField } from "./components/numeric-setting-field";
import { DEFAULT_GA_PARAMETERS } from "./ga-parameters";
import type { ExperimentSettings } from "./hooks/create-experiment-settings";
import type { FunctionType } from "./objective-functions";
import { OBJECTIVE_FUNCTIONS } from "./objective-functions";

interface ControlPanelProps {
	drafts: ExperimentSettings;
	functionType: FunctionType;
	populationSize: number;
	generations: number;
	settingsLocked: boolean;
	onResetParameters: () => void;
	onFunctionTypeChange: (value: FunctionType) => void;
	minPopulationSize: number;
	maxPopulationSize: number;
	minGenerations: number;
	maxGenerations: number;
}

export function ControlPanel(props: ControlPanelProps) {
	let settings!: HTMLDetailsElement;
	let mobileQuery: MediaQueryList | undefined;
	const updateLayout = () => {
		settings.open = !mobileQuery?.matches;
	};
	onMount(() => {
		if (typeof window.matchMedia !== "function") return;
		mobileQuery = window.matchMedia("(max-width: 1024px)");
		updateLayout();
		mobileQuery.addEventListener("change", updateLayout);
	});
	onCleanup(() => mobileQuery?.removeEventListener("change", updateLayout));
	return (
		<div class="controls">
			<details
				class="settings-details"
				ref={(element) => {
					settings = element;
					props.drafts.setElement(element);
				}}
				open
			>
				<summary class="settings-toggle">
					<span class="settings-title">
						実験設定
						<Show when={props.drafts.invalidSettings()}>
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
								onChange={(event) =>
									props.onFunctionTypeChange(
										event.currentTarget.value as FunctionType,
									)
								}
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

						<NumericSettingField
							id="populationSize"
							label={
								<>
									個体数 ({props.minPopulationSize}-{props.maxPopulationSize}):
								</>
							}
							draft={props.drafts.population}
							min={props.minPopulationSize}
							max={props.maxPopulationSize}
							disabled={props.settingsLocked}
							errorId="population-error"
							errorMessage={
								<>
									{props.minPopulationSize}〜{props.maxPopulationSize}
									の整数を入力してください。
								</>
							}
						/>
						<NumericSettingField
							id="generations"
							label={
								<>
									世代数 ({props.minGenerations}-{props.maxGenerations}):
								</>
							}
							draft={props.drafts.generations}
							min={props.minGenerations}
							max={props.maxGenerations}
							disabled={props.settingsLocked}
							errorMessage={
								<>
									{props.minGenerations}〜{props.maxGenerations}
									の整数を入力してください。
								</>
							}
						/>
					</div>
					<details class="advanced-settings">
						<summary class="settings-toggle">
							<span class="settings-title">
								詳細設定
								<Show when={props.drafts.invalidParameters()}>
									<span class="settings-error-badge">入力エラー</span>
								</Show>
							</span>
						</summary>
						<div class="parameter-controls advanced-settings-content">
							{props.drafts.parameterFields.map((field) => (
								<NumericSettingField
									id={`ga-${field.key}`}
									label={
										<>
											{field.label} ({field.min}〜{field.max})
										</>
									}
									draft={field}
									min={field.min}
									max={field.max}
									step={field.integer ? 1 : "any"}
									disabled={props.settingsLocked}
									description={
										<>
											{field.description} 初期値:{" "}
											{DEFAULT_GA_PARAMETERS[field.key]}
										</>
									}
									errorMessage={
										<>
											{field.min}〜{field.max}の
											{field.integer ? "整数" : "数値"}を入力してください。
										</>
									}
								/>
							))}
							<button
								type="button"
								class="btn btn-secondary"
								disabled={props.settingsLocked}
								onClick={() => {
									props.onResetParameters();
									for (const field of props.drafts.parameterFields)
										field.cancel();
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
