import { DEFAULT_CONFIG, type GAConfig } from "./genetic-algorithm";

export const GA_PARAMETER_FIELDS = [
	{
		key: "mutationRate",
		label: "突然変異率",
		description:
			"各個体の座標にランダムな変化を加える確率です。0.1 は10%です。",
		min: 0,
		max: 1,
		integer: false,
	},
	{
		key: "crossoverRate",
		label: "交叉率",
		description: "親の座標を組み合わせて子を作る確率です。0.8 は80%です。",
		min: 0,
		max: 1,
		integer: false,
	},
	{
		key: "tournamentSize",
		label: "トーナメントサイズ",
		description:
			"親を選ぶ候補の数です。大きいほど評価値の良い個体が選ばれやすくなります。",
		min: 1,
		max: 1000,
		integer: true,
	},
] as const;

export type GAParameterName = (typeof GA_PARAMETER_FIELDS)[number]["key"];
export type GAParameters = Pick<GAConfig, GAParameterName>;

export const DEFAULT_GA_PARAMETERS: GAParameters = {
	mutationRate: DEFAULT_CONFIG.mutationRate,
	crossoverRate: DEFAULT_CONFIG.crossoverRate,
	tournamentSize: DEFAULT_CONFIG.tournamentSize,
};

export function isValidGAParameter(name: GAParameterName, value: number) {
	const field = GA_PARAMETER_FIELDS.find((field) => field.key === name);
	return (
		field !== undefined &&
		Number.isFinite(value) &&
		value >= field.min &&
		value <= field.max &&
		(!field.integer || Number.isInteger(value))
	);
}
