import type { RunStatus } from "./hooks/use-genetic-algorithm";

interface ProgressDisplayProps {
	currentGeneration: number;
	totalGenerations: number;
	status: RunStatus;
}

export function ProgressDisplay(props: ProgressDisplayProps) {
	const progressPercentage = () =>
		(props.currentGeneration / props.totalGenerations) * 100;

	return (
		<div class="progress">
			<div class="progress-header">
				<output class="run-status" aria-live="polite">
					{
						{
							ready: "開始前",
							running: "実行中",
							paused: "一時停止中",
							completed: "実行が完了しました",
						}[props.status]
					}
				</output>
				<div class="progress-label">
					{props.currentGeneration} / {props.totalGenerations}世代
				</div>
			</div>
			<div
				class="progress-bar"
				role="progressbar"
				aria-label="実行の進行状況"
				aria-valuemin={0}
				aria-valuemax={props.totalGenerations}
				aria-valuenow={props.currentGeneration}
			>
				<div
					class="progress-fill"
					style={{
						width: `${progressPercentage()}%`,
					}}
				/>
			</div>
		</div>
	);
}
