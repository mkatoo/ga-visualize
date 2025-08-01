interface ProgressDisplayProps {
	currentGeneration: number;
	totalGenerations: number;
}

export function ProgressDisplay(props: ProgressDisplayProps) {
	const progressPercentage = (props.currentGeneration / props.totalGenerations) * 100;

	return (
		<div class="progress">
			<div class="progress-label">
				進行状況: {props.currentGeneration} / {props.totalGenerations}
			</div>
			<div class="progress-bar">
				<div
					class="progress-fill"
					style={{
						width: `${progressPercentage}%`,
					}}
				/>
			</div>
		</div>
	);
}