import { createEffect, createSignal, onMount } from "solid-js";
import type { FunctionType, Individual } from "./genetic-algorithm";

interface VisualizerProps {
	population: Individual[];
	bounds: { min: number; max: number };
	generation: number;
	averageFitness: number;
	bestIndividual: Individual | null;
	functionType: FunctionType;
}

export function Visualizer(props: VisualizerProps) {
	let canvasRef: HTMLCanvasElement | undefined;
	const [canvasSize] = createSignal(500);

	const rosenbrockFunction = (x: number, y: number): number => {
		const a = 1;
		const b = 100;
		return (a - x) ** 2 + b * (y - x ** 2) ** 2;
	};

	const drawContourLines = (ctx: CanvasRenderingContext2D) => {
		const { min, max } = props.bounds;
		const size = canvasSize();

		ctx.strokeStyle = "#e0e0e0";
		ctx.lineWidth = 1;

		let levels: number[];

		if (props.functionType === "sphere") {
			levels = [0.25, 1, 4, 9, 16];
		} else if (props.functionType === "rosenbrock") {
			levels = [1, 4, 10, 25, 50, 100];
		} else {
			levels = [1, 4, 16, 64, 256];
		}

		if (props.functionType === "sphere") {
			for (const level of levels) {
				const radius = Math.sqrt(level);
				const pixelRadius = (radius / (max - min)) * size;

				if (pixelRadius > 0 && pixelRadius < size / 2) {
					ctx.beginPath();
					ctx.arc(size / 2, size / 2, pixelRadius, 0, 2 * Math.PI);
					ctx.stroke();
				}
			}
		} else if (props.functionType === "rosenbrock") {
			// Rosenbrock関数の等高線を簡易的に描画
			const resolution = 50;
			const step = (max - min) / resolution;

			for (const level of levels) {
				ctx.beginPath();
				let pathStarted = false;

				// Y軸方向にスキャンして等高線を描画
				for (let j = 0; j < resolution; j++) {
					const y = min + j * step;
					let lastInside = false;

					for (let i = 0; i < resolution; i++) {
						const x = min + i * step;
						const value = rosenbrockFunction(x, y);
						const isInside = value <= level;

						// 等高線の境界を検出
						if (i > 0 && isInside !== lastInside) {
							const pixelX = ((x - min) / (max - min)) * size;
							const pixelY = ((y - min) / (max - min)) * size;

							if (!pathStarted) {
								ctx.moveTo(pixelX, pixelY);
								pathStarted = true;
							} else {
								ctx.lineTo(pixelX, pixelY);
							}
						}
						lastInside = isInside;
					}
				}

				// X軸方向にもスキャンして等高線を補完
				for (let i = 0; i < resolution; i++) {
					const x = min + i * step;
					let lastInside = false;

					for (let j = 0; j < resolution; j++) {
						const y = min + j * step;
						const value = rosenbrockFunction(x, y);
						const isInside = value <= level;

						// 等高線の境界を検出
						if (j > 0 && isInside !== lastInside) {
							const pixelX = ((x - min) / (max - min)) * size;
							const pixelY = ((y - min) / (max - min)) * size;

							if (!pathStarted) {
								ctx.moveTo(pixelX, pixelY);
								pathStarted = true;
							} else {
								ctx.lineTo(pixelX, pixelY);
							}
						}
						lastInside = isInside;
					}
				}

				if (pathStarted) {
					ctx.stroke();
				}
			}
		}
	};

	const drawAxes = (ctx: CanvasRenderingContext2D) => {
		const size = canvasSize();

		ctx.strokeStyle = "#666";
		ctx.lineWidth = 1;

		ctx.beginPath();
		ctx.moveTo(size / 2, 0);
		ctx.lineTo(size / 2, size);
		ctx.moveTo(0, size / 2);
		ctx.lineTo(size, size / 2);
		ctx.stroke();

		ctx.fillStyle = "#666";
		ctx.font = "12px Arial";
		ctx.textAlign = "center";

		const { min, max } = props.bounds;
		const step = (max - min) / 4;

		for (let i = 0; i <= 4; i++) {
			const value = min + i * step;
			const pos = (i / 4) * size;

			if (Math.abs(value) > 0.1) {
				ctx.fillText(value.toFixed(0), pos, size / 2 + 15);
				ctx.fillText((-value).toFixed(0), size / 2 + 15, pos);
			}
		}
	};

	const drawPopulation = (ctx: CanvasRenderingContext2D) => {
		const { min, max } = props.bounds;
		const size = canvasSize();
		const range = max - min;

		if (props.population.length === 0) return;

		const bestIndividual = props.population.reduce((best, current) =>
			current.fitness < best.fitness ? current : best,
		);

		props.population.forEach((individual) => {
			const x = ((individual.x - min) / range) * size;
			const y = ((individual.y - min) / range) * size;

			if (individual === bestIndividual) {
				ctx.fillStyle = "#ff0000";
				ctx.beginPath();
				ctx.arc(x, y, 4, 0, 2 * Math.PI);
				ctx.fill();
			} else {
				ctx.fillStyle = "#0066cc";
				ctx.beginPath();
				ctx.arc(x, y, 2, 0, 2 * Math.PI);
				ctx.fill();
			}
		});
	};

	const draw = () => {
		const canvas = canvasRef;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvasSize(), canvasSize());

		ctx.fillStyle = "#f8f8f8";
		ctx.fillRect(0, 0, canvasSize(), canvasSize());

		drawContourLines(ctx);
		drawAxes(ctx);
		drawPopulation(ctx);
	};

	createEffect(() => {
		if (props.population.length > 0) {
			draw();
		}
	});

	onMount(() => {
		draw();
	});

	return (
		<div class="visualizer">
			<div class="canvas-container">
				<canvas
					ref={canvasRef}
					width={canvasSize()}
					height={canvasSize()}
					style={{
						border: "1px solid #ccc",
						"border-radius": "4px",
					}}
				/>
			</div>
			<div class="stats">
				<div class="stat-item">
					<span class="label">世代</span>
					<span class="value">{props.generation}</span>
				</div>
				<div class="stat-item best-individual">
					<span class="label">最良個体</span>
					<div class="best-individual-details">
						{props.bestIndividual ? (
							<>
								<div class="coordinate-display">
									<span class="coord-label">座標:</span>
									<span
										class="coord-value tooltip"
										title={`座標: (${props.bestIndividual.x}, ${props.bestIndividual.y})`}
									>
										({props.bestIndividual.x.toFixed(3)},{" "}
										{props.bestIndividual.y.toFixed(3)})
									</span>
								</div>
								<div class="fitness-display">
									<span class="fitness-label">適応度:</span>
									<span
										class="fitness-value tooltip"
										title={`適応度: ${props.bestIndividual.fitness}`}
									>
										{props.bestIndividual.fitness.toFixed(4)}
									</span>
								</div>
							</>
						) : (
							<span class="no-data">データなし</span>
						)}
					</div>
				</div>
				<div class="stat-item">
					<span class="label">平均適応度</span>
					<span class="value">{props.averageFitness.toFixed(4)}</span>
				</div>
			</div>
		</div>
	);
}
