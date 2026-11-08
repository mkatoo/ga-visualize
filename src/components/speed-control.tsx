import { MAX_ANIMATION_INTERVAL, MIN_ANIMATION_INTERVAL } from "../constants";

interface SpeedControlProps {
	animationSpeed: number;
	onSpeedChange: (interval: number) => void;
}

export function SpeedControl(props: SpeedControlProps) {
	const speedLabel = () => `${props.animationSpeed / 1000}秒／世代`;
	return (
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
	);
}
