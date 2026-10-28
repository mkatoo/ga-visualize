import { createMemo, For, Show } from "solid-js";
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
				<span>評価値</span>
				<Show when={props.scale.logarithmic}>
					<span>対数目盛</span>
				</Show>
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
							style={{ bottom: `${tick.position * 100}%` }}
							title={tick.value.toString()}
						>
							{tick.value >= 10_000
								? tick.value.toExponential(1)
								: fitnessNumberFormat.format(tick.value)}
						</span>
					)}
				</For>
			</div>
		</figure>
	);
}
