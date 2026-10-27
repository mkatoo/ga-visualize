import { createMemo, For } from "solid-js";
import {
	FITNESS_COLOR_GRADIENT,
	type FitnessColorScale,
	getFitnessValueAtPosition,
} from "../fitness-colors";

const fitnessNumberFormat = new Intl.NumberFormat("ja-JP", {
	maximumFractionDigits: 1,
});

export function FitnessScale(props: { scale: FitnessColorScale }) {
	const ticks = createMemo(() =>
		[0, 0.25, 0.5, 0.75, 1].map((position) => ({
			position,
			value: getFitnessValueAtPosition(position, props.scale),
		})),
	);
	return (
		<figure class="fitness-scale" aria-label="背景色と評価値の対応">
			<figcaption class="fitness-scale-header">
				<span>評価値（色）</span>
				<span>{props.scale.logarithmic ? "対数目盛" : "線形目盛"}</span>
			</figcaption>
			<div
				class="fitness-scale-bar"
				style={{ background: FITNESS_COLOR_GRADIENT }}
				aria-hidden="true"
			/>
			<div class="fitness-scale-ticks">
				<For each={ticks()}>
					{(tick) => (
						<span
							style={{ left: `${tick.position * 100}%` }}
							title={tick.value.toString()}
						>
							{fitnessNumberFormat.format(tick.value)}
						</span>
					)}
				</For>
			</div>
			<div class="fitness-scale-direction">
				<span>小さいほど良い</span>
				<span>大きいほど悪い</span>
			</div>
		</figure>
	);
}
