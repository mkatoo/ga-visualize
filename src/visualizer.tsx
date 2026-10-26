import { createEffect, createMemo, For } from "solid-js";
import {
	AXIS_LABEL_THRESHOLD,
	CANVAS_SIZE,
	CONTOUR_RESOLUTION,
} from "./constants";
import {
	FITNESS_COLOR_GRADIENT,
	type FitnessColorScale,
	getFitnessColor,
	getFitnessColorPosition,
	getFitnessValueAtPosition,
} from "./fitness-colors";
import type { Individual } from "./genetic-algorithm";
import type { FunctionType } from "./objective-functions";
import { getObjectiveFunction } from "./objective-functions";

interface VisualizerProps {
	population: Individual[];
	bounds: { min: number; max: number };
	generation: number;
	averageFitness: number;
	bestIndividual: Individual | null;
	functionType: FunctionType;
}

interface Point {
	x: number;
	y: number;
}

interface Segment {
	start: Point;
	end: Point;
}

// Utility function for linear interpolation to find contour intersections
const interpolate = (
	x1: number,
	y1: number,
	v1: number,
	x2: number,
	y2: number,
	v2: number,
	level: number,
): Point | null => {
	if (v1 === v2) return null;
	const t = (level - v1) / (v2 - v1);
	if (t < 0 || t > 1) return null;
	return {
		x: x1 + t * (x2 - x1),
		y: y1 + t * (y2 - y1),
	};
};

// Creates a grid of function values for contour line calculation
const createFunctionGrid = (
	objFunc: (x: number, y: number) => number,
	bounds: { min: number; max: number },
	resolution: number,
): number[][] => {
	const { min, max } = bounds;
	const step = (max - min) / resolution;
	const grid: number[][] = [];

	for (let i = 0; i <= resolution; i++) {
		grid[i] = [];
		for (let j = 0; j <= resolution; j++) {
			const x = min + i * step;
			const y = min + j * step;
			grid[i][j] = objFunc(x, y);
		}
	}

	return grid;
};

// Finds contour line intersections for a specific level using marching squares algorithm
const findContourIntersections = (
	grid: number[][],
	level: number,
	bounds: { min: number; max: number },
	resolution: number,
): Segment[] => {
	const { min, max } = bounds;
	const step = (max - min) / resolution;
	const segments: Segment[] = [];

	// グリッドの各セルを処理
	for (let i = 0; i < resolution; i++) {
		for (let j = 0; j < resolution; j++) {
			const x1 = min + i * step;
			const y1 = min + j * step;
			const x2 = min + (i + 1) * step;
			const y2 = min + (j + 1) * step;

			const v1 = grid[i][j]; // 左下
			const v2 = grid[i + 1][j]; // 右下
			const v3 = grid[i + 1][j + 1]; // 右上
			const v4 = grid[i][j + 1]; // 左上

			const intersections: Point[] = [];

			// 各辺で等高線との交点をチェック
			const bottom = interpolate(x1, y1, v1, x2, y1, v2, level);
			const right = interpolate(x2, y1, v2, x2, y2, v3, level);
			const top = interpolate(x2, y2, v3, x1, y2, v4, level);
			const left = interpolate(x1, y2, v4, x1, y1, v1, level);

			if (bottom) intersections.push(bottom);
			if (right) intersections.push(right);
			if (top) intersections.push(top);
			if (left) intersections.push(left);

			// 2つの交点がある場合、線分として追加
			if (intersections.length === 2) {
				segments.push({
					start: intersections[0],
					end: intersections[1],
				});
			}
			// 4つの交点がある場合は特殊ケース（サドルポイント）
			else if (intersections.length === 4) {
				// 対角線で結ぶ
				segments.push({
					start: intersections[0],
					end: intersections[1],
				});
				segments.push({
					start: intersections[2],
					end: intersections[3],
				});
			}
		}
	}

	return segments;
};

// Draws contour line segments on the canvas
const drawContourSegments = (
	ctx: CanvasRenderingContext2D,
	segments: Segment[],
	bounds: { min: number; max: number },
	canvasSize: number,
): void => {
	const { min, max } = bounds;

	if (segments.length === 0) return;
	ctx.beginPath();
	// 線分を描画
	for (const segment of segments) {
		const startX = ((segment.start.x - min) / (max - min)) * canvasSize;
		const startY = ((max - segment.start.y) / (max - min)) * canvasSize;
		const endX = ((segment.end.x - min) / (max - min)) * canvasSize;
		const endY = ((max - segment.end.y) / (max - min)) * canvasSize;

		ctx.moveTo(startX, startY);
		ctx.lineTo(endX, endY);
	}
	ctx.stroke();
};

const drawAxes = (
	ctx: CanvasRenderingContext2D,
	bounds: { min: number; max: number },
	size: number,
) => {
	ctx.strokeStyle = "rgba(30, 41, 59, 0.6)";
	ctx.lineWidth = 1;

	ctx.beginPath();
	ctx.moveTo(size / 2, 0);
	ctx.lineTo(size / 2, size);
	ctx.moveTo(0, size / 2);
	ctx.lineTo(size, size / 2);
	ctx.stroke();

	ctx.fillStyle = "#334155";
	ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
	ctx.lineWidth = 3;
	ctx.font = "12px Arial";
	ctx.textAlign = "center";

	const { min, max } = bounds;
	const step = (max - min) / 4;

	for (let i = 0; i <= 4; i++) {
		const value = min + i * step;
		const pos = (i / 4) * size;

		if (Math.abs(value) > AXIS_LABEL_THRESHOLD) {
			ctx.strokeText(value.toFixed(0), pos, size / 2 + 15);
			ctx.fillText(value.toFixed(0), pos, size / 2 + 15);
			ctx.strokeText((-value).toFixed(0), size / 2 + 15, pos);
			ctx.fillText((-value).toFixed(0), size / 2 + 15, pos);
		}
	}
};

const createLandscape = (
	functionType: FunctionType,
	bounds: { min: number; max: number },
	size: number,
) => {
	const objective = getObjectiveFunction(functionType);
	const grid = createFunctionGrid(objective.fn, bounds, size - 1);
	let maximum = 0;
	for (const column of grid) {
		for (const value of column) maximum = Math.max(maximum, value);
	}
	const scale: FitnessColorScale = {
		maximum,
		logarithmic: functionType === "rosenbrock" || functionType === "beale",
	};

	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return { canvas, scale };

	const image = ctx.createImageData(size, size);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const value = grid[x][size - 1 - y];
			const color = getFitnessColor(getFitnessColorPosition(value, scale));
			const offset = (y * size + x) * 4;
			image.data[offset] = color[0];
			image.data[offset + 1] = color[1];
			image.data[offset + 2] = color[2];
			image.data[offset + 3] = 255;
		}
	}
	ctx.putImageData(image, 0, 0);

	ctx.strokeStyle = "rgba(30, 41, 59, 0.24)";
	ctx.lineWidth = 0.8;
	const contourGrid = createFunctionGrid(
		objective.fn,
		bounds,
		CONTOUR_RESOLUTION,
	);
	for (const level of objective.contourLevels) {
		const segments = findContourIntersections(
			contourGrid,
			level,
			bounds,
			CONTOUR_RESOLUTION,
		);
		drawContourSegments(ctx, segments, bounds, size);
	}
	drawAxes(ctx, bounds, size);
	return { canvas, scale };
};

const fitnessNumberFormat = new Intl.NumberFormat("ja-JP", {
	maximumFractionDigits: 1,
});

export function Visualizer(props: VisualizerProps) {
	let canvasRef: HTMLCanvasElement | undefined;
	const settings = createMemo(
		() => ({
			functionType: props.functionType,
			min: props.bounds.min,
			max: props.bounds.max,
		}),
		undefined,
		{
			equals: (previous, next) =>
				previous.functionType === next.functionType &&
				previous.min === next.min &&
				previous.max === next.max,
		},
	);
	const landscape = createMemo(() => {
		const { functionType, min, max } = settings();
		return createLandscape(functionType, { min, max }, CANVAS_SIZE);
	});
	const colorTicks = createMemo(() =>
		[0, 0.25, 0.5, 0.75, 1].map((position) => ({
			position,
			value: getFitnessValueAtPosition(position, landscape().scale),
		})),
	);

	const drawPopulation = (ctx: CanvasRenderingContext2D) => {
		const { min, max } = props.bounds;
		const size = CANVAS_SIZE;
		const range = max - min;

		if (props.population.length === 0) return;

		const bestIndividual = props.population.reduce((best, current) =>
			current.fitness < best.fitness ? current : best,
		);

		const drawIndividual = (individual: Individual, best: boolean) => {
			const x = ((individual.x - min) / range) * size;
			const y = ((max - individual.y) / range) * size;

			ctx.fillStyle = best ? "#ff0000" : "#0066cc";
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = best ? 2.5 : 2;
			ctx.beginPath();
			ctx.arc(x, y, best ? 4 : 2, 0, 2 * Math.PI);
			ctx.stroke();
			ctx.fill();
		};

		props.population.forEach((individual) => {
			if (individual !== bestIndividual) drawIndividual(individual, false);
		});
		// Keep the best individual visible even when the population converges.
		drawIndividual(bestIndividual, true);
	};

	const draw = () => {
		const canvas = canvasRef;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
		ctx.drawImage(landscape().canvas, 0, 0);
		drawPopulation(ctx);
	};

	createEffect(draw);

	return (
		<div class="visualizer">
			<div class="canvas-container">
				<canvas
					ref={canvasRef}
					width={CANVAS_SIZE}
					height={CANVAS_SIZE}
					aria-label="最適化関数の地形と個体分布"
					style={{
						border: "1px solid #ccc",
						"border-radius": "4px",
					}}
				/>
			</div>
			<figure class="fitness-scale" aria-label="背景色と評価値の対応">
				<figcaption class="fitness-scale-header">
					<span>評価値</span>
					<span>{landscape().scale.logarithmic ? "対数目盛" : "線形目盛"}</span>
				</figcaption>
				<div
					class="fitness-scale-bar"
					style={{ background: FITNESS_COLOR_GRADIENT }}
					aria-hidden="true"
				/>
				<div class="fitness-scale-ticks">
					<For each={colorTicks()}>
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
					<span>低い・良い</span>
					<span>高い・悪い</span>
				</div>
			</figure>
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
