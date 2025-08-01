interface FitnessChartProps {
	bestFitness: number[];
	averageFitness: number[];
	totalGenerations: number;
}

export function FitnessChart(props: FitnessChartProps) {
	return (
		<div class="fitness-chart">
			<h3>適応度の推移</h3>
			<div class="chart-container">
				<svg width="300" height="200" viewBox="0 0 300 200">
					<title>遺伝的アルゴリズムの適応度推移グラフ</title>
					<defs>
						<linearGradient id="bestGradient" x1="0%" y1="0%" x2="0%" y2="100%">
							<stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:0.3" />
							<stop offset="100%" style="stop-color:#ff6b6b;stop-opacity:0.1" />
						</linearGradient>
						<linearGradient id="avgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
							<stop offset="0%" style="stop-color:#4ecdc4;stop-opacity:0.3" />
							<stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:0.1" />
						</linearGradient>
					</defs>

					<g class="chart-axes">
						<line x1="30" y1="170" x2="280" y2="170" stroke="#ddd" />
						<line x1="30" y1="20" x2="30" y2="170" stroke="#ddd" />
					</g>

					<g class="chart-data">
						{props.bestFitness.length > 1 && (
							<>
								<polyline
									points={props.bestFitness
										.map((fitness, i) => {
											const x = 30 + (i / (props.totalGenerations - 1)) * 250;
											const maxFitness = Math.max(...props.averageFitness);
											const y = 170 - (fitness / maxFitness) * 150;
											return `${x},${y}`;
										})
										.join(" ")}
									fill="none"
									stroke="#ff6b6b"
									stroke-width="2"
								/>
								<polyline
									points={props.averageFitness
										.map((fitness, i) => {
											const x = 30 + (i / (props.totalGenerations - 1)) * 250;
											const maxFitness = Math.max(...props.averageFitness);
											const y = 170 - (fitness / maxFitness) * 150;
											return `${x},${y}`;
										})
										.join(" ")}
									fill="none"
									stroke="#4ecdc4"
									stroke-width="2"
								/>
							</>
						)}
					</g>

					<g class="chart-labels">
						<text x="155" y="195" text-anchor="middle" class="axis-label">
							世代
						</text>
						<text
							x="15"
							y="100"
							text-anchor="middle"
							class="axis-label"
							transform="rotate(-90 15 100)"
						>
							適応度
						</text>
					</g>
				</svg>
				<div class="legend">
					<div class="legend-item">
						<span class="legend-color" style="background-color: #ff6b6b"></span>
						最良適応度
					</div>
					<div class="legend-item">
						<span class="legend-color" style="background-color: #4ecdc4"></span>
						平均適応度
					</div>
				</div>
			</div>
		</div>
	);
}
