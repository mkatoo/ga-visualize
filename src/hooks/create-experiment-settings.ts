import { createMemo } from "solid-js";
import {
	GA_PARAMETER_FIELDS,
	type GAParameterName,
	type GAParameters,
	isValidGAParameter,
} from "../ga-parameters";
import { createNumericDraft, isIntegerInRange } from "./create-numeric-draft";

interface ExperimentSettingsOptions {
	populationSize: number;
	generations: number;
	parameters: GAParameters;
	settingsLocked: boolean;
	constraints: {
		minPopulationSize: number;
		maxPopulationSize: number;
		minGenerations: number;
		maxGenerations: number;
	};
	onPopulationSizeChange: (value: number) => void;
	onGenerationsChange: (value: number) => void;
	onParameterChange: (name: GAParameterName, value: number) => void;
}

export function createExperimentSettings(props: ExperimentSettingsOptions) {
	const population = createNumericDraft({
		value: () => props.populationSize,
		validate: (value) =>
			isIntegerInRange(
				value,
				props.constraints.minPopulationSize,
				props.constraints.maxPopulationSize,
			),
		onCommit: (value) => props.onPopulationSizeChange(value),
		disabled: () => props.settingsLocked,
	});
	const generations = createNumericDraft({
		value: () => props.generations,
		validate: (value) =>
			isIntegerInRange(
				value,
				props.constraints.minGenerations,
				props.constraints.maxGenerations,
			),
		onCommit: (value) => props.onGenerationsChange(value),
		disabled: () => props.settingsLocked,
	});
	const parameterFields = GA_PARAMETER_FIELDS.map((field) => {
		const value = createMemo(() => props.parameters[field.key]);
		return {
			...field,
			...createNumericDraft({
				value,
				validate: (value) => isValidGAParameter(field.key, value),
				onCommit: (value) => props.onParameterChange(field.key, value),
				disabled: () => props.settingsLocked,
			}),
		};
	});
	const invalidParameters = () =>
		parameterFields.some((field) => field.invalid());
	const invalidSettings = () =>
		population.invalid() || generations.invalid() || invalidParameters();
	let settings!: HTMLDetailsElement;
	const focusInvalidSetting = () => {
		settings.open = true;
		const input = settings.querySelector<HTMLInputElement>(
			'input[aria-invalid="true"]',
		);
		const details = input?.closest("details");
		if (details) details.open = true;
		input?.focus();
	};

	return {
		population,
		generations,
		parameterFields,
		invalidParameters,
		invalidSettings,
		setElement: (element: HTMLDetailsElement) => {
			settings = element;
		},
		focusInvalidSetting,
		cancelDrafts: () => {
			population.cancel();
			generations.cancel();
			for (const field of parameterFields) field.cancel();
		},
	};
}

export type ExperimentSettings = ReturnType<typeof createExperimentSettings>;
