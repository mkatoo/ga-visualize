import { createEffect, createSignal, onMount } from "solid-js";
import {
	AXIS_LABEL_THRESHOLD,
	CANVAS_SIZE,
	CONTOUR_RESOLUTION,
} from "./constants";
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

	// 線分を描画
	for (const segment of segments) {
		const startX = ((segment.start.x - min) / (max - min)) * canvasSize;
		const startY = ((segment.start.y - min) / (max - min)) * canvasSize;
		const endX = ((segment.end.x - min) / (max - min)) * canvasSize;
		const endY = ((segment.end.y - min) / (max - min)) * canvasSize;

		ctx.beginPath();
		ctx.moveTo(startX, startY);
		ctx.lineTo(endX, endY);
		ctx.stroke();
	}
};

export function Visualizer(props: VisualizerProps) {
	let canvasRef: HTMLCanvasElement | undefined;
	const [canvasSize] = createSignal(CANVAS_SIZE);

	const drawContourLines = (ctx: CanvasRenderingContext2D) => {
		const size = canvasSize();

		ctx.strokeStyle = "#e0e0e0";
		ctx.lineWidth = 1;

		const objFunc = getObjectiveFunction(props.functionType);
		const levels = objFunc.contourLevels;
		const functionToUse = objFunc.fn;

		const resolution = CONTOUR_RESOLUTION;

		// Create function value grid
		const grid = createFunctionGrid(functionToUse, props.bounds, resolution);

		// Process each contour level
		for (const level of levels) {
			const segments = findContourIntersections(
				grid,
				level,
				props.bounds,
				resolution,
			);
			drawContourSegments(ctx, segments, props.bounds, size);
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

			if (Math.abs(value) > AXIS_LABEL_THRESHOLD) {
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
