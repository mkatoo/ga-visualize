import { createEffect, createMemo } from "solid-js";
import {
	AXIS_LABEL_THRESHOLD,
	CANVAS_SIZE,
	CONTOUR_RESOLUTION,
} from "./constants";
import { getFitnessColor, getFitnessColorPosition } from "./fitness-colors";
import type { Individual } from "./genetic-algorithm";
import { createFunctionGrid, type Landscape } from "./landscape";
import { getObjectiveFunction } from "./objective-functions";
import { VISUALIZATION_COLORS } from "./visualization-colors";

interface VisualizerProps {
	population: Individual[];
	bestIndividual: Individual | null;
	landscape: Landscape;
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
	if (!Number.isFinite(v1) || !Number.isFinite(v2) || v1 === v2) return null;
	const t = (level - v1) / (v2 - v1);
	if (t < 0 || t > 1) return null;
	return {
		x: x1 + t * (x2 - x1),
		y: y1 + t * (y2 - y1),
	};
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

const createBackground = (landscape: Landscape, size: number) => {
	const { grid, bounds, colorScale: scale } = landscape;
	const objective = getObjectiveFunction(landscape.functionType);

	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;

	const image = ctx.createImageData(size, size);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const value = grid[x][size - 1 - y];
			const color = getFitnessColor(
				getFitnessColorPosition(Number.isFinite(value) ? value : 0, scale),
			);
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
	return canvas;
};

export function Visualizer(props: VisualizerProps) {
	let canvasRef: HTMLCanvasElement | undefined;
	const background = createMemo(() =>
		createBackground(props.landscape, CANVAS_SIZE),
	);

	const drawPopulation = (ctx: CanvasRenderingContext2D) => {
		const { min, max } = props.landscape.bounds;
		const size = CANVAS_SIZE;
		const range = max - min;

		if (props.population.length === 0) return;

		const bestIndividual = props.bestIndividual;

		const drawIndividual = (individual: Individual, best: boolean) => {
			const x = ((individual.x - min) / range) * size;
			const y = ((max - individual.y) / range) * size;

			ctx.fillStyle = best
				? VISUALIZATION_COLORS.best
				: VISUALIZATION_COLORS.population;
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
		if (bestIndividual) drawIndividual(bestIndividual, true);
	};

	const draw = () => {
		const canvas = canvasRef;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
		ctx.drawImage(background(), 0, 0);
		drawPopulation(ctx);
	};

	createEffect(draw);

	return (
		<div class="canvas-container">
			<canvas
				ref={canvasRef}
				width={CANVAS_SIZE}
				height={CANVAS_SIZE}
				aria-label="目的関数の地形と個体分布"
				style={{
					border: "1px solid #ccc",
					"border-radius": "4px",
				}}
			/>
		</div>
	);
}
