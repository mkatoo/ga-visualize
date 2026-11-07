import {
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import {
	AXIS_LABEL_THRESHOLD,
	CANVAS_SIZE,
	CONTOUR_RESOLUTION,
} from "./constants";
import { findContourIntersections, type Segment } from "./contours";
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

const axisNumberFormat = new Intl.NumberFormat("ja-JP", {
	maximumFractionDigits: 2,
});

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

	const { min, max } = bounds;
	const step = (max - min) / 4;
	const labelPadding = 4;

	for (let i = 0; i <= 4; i++) {
		const value = min + i * step;
		const pos = (i / 4) * size;

		if (Math.abs(value) > AXIS_LABEL_THRESHOLD) {
			const xLabel = axisNumberFormat.format(value);
			const yLabel = axisNumberFormat.format(-value);
			// Keep endpoint labels and their outlines inside the canvas.
			const labelPos = Math.max(
				labelPadding,
				Math.min(size - labelPadding, pos),
			);
			ctx.textAlign = i === 0 ? "left" : i === 4 ? "right" : "center";
			ctx.textBaseline = "alphabetic";
			ctx.strokeText(xLabel, labelPos, size / 2 + 15);
			ctx.fillText(xLabel, labelPos, size / 2 + 15);
			ctx.textAlign = "center";
			ctx.textBaseline = i === 0 ? "top" : i === 4 ? "bottom" : "alphabetic";
			ctx.strokeText(yLabel, size / 2 + 15, labelPos);
			ctx.fillText(yLabel, size / 2 + 15, labelPos);
		}
	}
};

const createHeatmap = (landscape: Landscape) => {
	const { grid, colorScale: scale } = landscape;
	const size = CANVAS_SIZE;
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
	return canvas;
};

const createBackground = (
	landscape: Landscape,
	heatmap: HTMLCanvasElement,
	size: number,
	pixelRatio: number,
) => {
	const { bounds } = landscape;
	const objective = getObjectiveFunction(landscape.functionType);
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(size * pixelRatio);
	canvas.height = Math.round(size * pixelRatio);
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	ctx.drawImage(heatmap, 0, 0, size, size);

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
	const { optimum } = objective;
	if (
		optimum.x >= bounds.min &&
		optimum.x <= bounds.max &&
		optimum.y >= bounds.min &&
		optimum.y <= bounds.max
	) {
		const x = ((optimum.x - bounds.min) / (bounds.max - bounds.min)) * size;
		const y = ((bounds.max - optimum.y) / (bounds.max - bounds.min)) * size;
		ctx.beginPath();
		ctx.moveTo(x - 4, y - 4);
		ctx.lineTo(x + 4, y + 4);
		ctx.moveTo(x + 4, y - 4);
		ctx.lineTo(x - 4, y + 4);
		ctx.strokeStyle = "white";
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.strokeStyle = "#0f766e";
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}
	return canvas;
};

export function Visualizer(props: VisualizerProps) {
	let host!: HTMLDivElement;
	let canvasRef: HTMLCanvasElement | undefined;
	const [viewport, setViewport] = createSignal({
		size: CANVAS_SIZE,
		pixelRatio: 1,
	});
	const heatmap = createMemo(() => createHeatmap(props.landscape));
	const background = createMemo(() =>
		createBackground(
			props.landscape,
			heatmap(),
			viewport().size,
			viewport().pixelRatio,
		),
	);
	let observer: ResizeObserver | undefined;
	const updateSize = (width: number) => {
		if (width <= 0) return;
		const size = Math.round(width);
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		setViewport((previous) =>
			previous.size === size && previous.pixelRatio === pixelRatio
				? previous
				: { size, pixelRatio },
		);
	};
	const measure = () => updateSize(host.clientWidth);
	onMount(() => {
		measure();
		window.addEventListener("resize", measure);
		if (typeof ResizeObserver === "undefined") return;
		observer = new ResizeObserver(([entry]) => {
			if (entry) updateSize(entry.contentRect.width);
		});
		observer.observe(host);
	});
	onCleanup(() => {
		observer?.disconnect();
		window.removeEventListener("resize", measure);
	});

	const drawPopulation = (ctx: CanvasRenderingContext2D) => {
		const { min, max } = props.landscape.bounds;
		const size = viewport().size;
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
		const { size, pixelRatio } = viewport();
		const pixels = Math.round(size * pixelRatio);
		// Resizing clears a canvas. Set the backing size before drawing so a JSX
		// attribute update cannot erase the first frame after ResizeObserver runs.
		if (canvas.width !== pixels) canvas.width = pixels;
		if (canvas.height !== pixels) canvas.height = pixels;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(background(), 0, 0);
		ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		drawPopulation(ctx);
	};

	createEffect(draw);

	return (
		<div class="canvas-container" ref={host}>
			<canvas
				ref={canvasRef}
				width={CANVAS_SIZE}
				height={CANVAS_SIZE}
				aria-label="目的関数の地形と個体分布"
			/>
		</div>
	);
}
