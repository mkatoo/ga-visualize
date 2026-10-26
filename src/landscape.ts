import { CANVAS_SIZE } from "./constants";
import type { FitnessColorScale } from "./fitness-colors";
import type { Individual } from "./genetic-algorithm";
import { type FunctionType, getObjectiveFunction } from "./objective-functions";

export interface Bounds {
	min: number;
	max: number;
}

export type HeightScale = "linear" | "logarithmic";

export interface Landscape {
	functionType: FunctionType;
	bounds: Bounds;
	grid: number[][];
	colorScale: FitnessColorScale;
	issue: string | null;
}

export const createFunctionGrid = (
	fn: (x: number, y: number) => number,
	bounds: Bounds,
	resolution: number,
): number[][] => {
	if (
		!Number.isFinite(bounds.min) ||
		!Number.isFinite(bounds.max) ||
		bounds.max <= bounds.min ||
		!Number.isInteger(resolution) ||
		resolution < 1
	) {
		throw new Error("探索範囲と格子の分割数が不正です。");
	}
	const step = (bounds.max - bounds.min) / resolution;
	return Array.from({ length: resolution + 1 }, (_, x) =>
		Array.from({ length: resolution + 1 }, (_, y) =>
			fn(bounds.min + x * step, bounds.min + y * step),
		),
	);
};

// This fixed 500 × 500 grid defines both views' colors and heights. Surface
// resolution and population updates must never change its maximum.
export const createLandscape = (
	functionType: FunctionType,
	bounds: Bounds,
): Landscape => {
	const grid = createFunctionGrid(
		getObjectiveFunction(functionType).fn,
		bounds,
		CANVAS_SIZE - 1,
	);
	let maximum = 0;
	let issue: string | null = null;
	for (const column of grid) {
		for (const value of column) {
			if (!Number.isFinite(value)) {
				issue = "地形の評価値に有限でない値があるため、3D表示できません。";
			} else {
				maximum = Math.max(maximum, value);
			}
		}
	}
	return {
		functionType,
		bounds: { ...bounds },
		grid,
		colorScale: {
			maximum,
			logarithmic: functionType === "rosenbrock" || functionType === "beale",
		},
		issue,
	};
};

export const getDefaultHeightScale = (landscape: Landscape): HeightScale =>
	landscape.colorScale.logarithmic ? "logarithmic" : "linear";

export const getFitnessHeight = (
	value: number,
	maximum: number,
	scale: HeightScale,
): number => {
	if (maximum <= 0) return 0;
	const nonnegative = Math.max(0, value);
	return scale === "logarithmic"
		? Math.log1p(nonnegative) / Math.log1p(maximum)
		: nonnegative / maximum;
};

export const getHeightTickValue = (
	position: number,
	maximum: number,
	scale: HeightScale,
): number => {
	if (position === 0 || maximum <= 0) return 0;
	if (position === 1) return maximum;
	return scale === "logarithmic"
		? Math.expm1(position * Math.log1p(maximum))
		: position * maximum;
};

export const getIndividualPosition = (
	individual: Individual,
	landscape: Landscape,
	scale: HeightScale,
): [number, number, number] => {
	const { min, max } = landscape.bounds;
	return [
		(2 * (individual.x - min)) / (max - min) - 1,
		(2 * (individual.y - min)) / (max - min) - 1,
		getFitnessHeight(individual.fitness, landscape.colorScale.maximum, scale),
	];
};

export interface SurfaceGrid {
	resolution: number;
	fitness: Float64Array;
	indices: Uint32Array;
	gridIndices: Uint32Array;
}

export const createSurfaceGrid = (
	landscape: Landscape,
	resolution = 100,
): SurfaceGrid => {
	if (landscape.issue) throw new Error(landscape.issue);
	const grid = createFunctionGrid(
		getObjectiveFunction(landscape.functionType).fn,
		landscape.bounds,
		resolution,
	);
	const fitness = new Float64Array((resolution + 1) ** 2);
	const indices: number[] = [];
	const gridIndices: number[] = [];
	for (let x = 0; x <= resolution; x++) {
		for (let y = 0; y <= resolution; y++) {
			const i = x * (resolution + 1) + y;
			const value = grid[x][y];
			if (!Number.isFinite(value)) {
				throw new Error(
					"曲面の評価値に有限でない値があるため、3D表示できません。",
				);
			}
			fitness[i] = value;
			if (x < resolution) gridIndices.push(i, i + resolution + 1);
			if (y < resolution) gridIndices.push(i, i + 1);
			if (x < resolution && y < resolution) {
				const next = i + resolution + 1;
				indices.push(i, next, i + 1, next, next + 1, i + 1);
			}
		}
	}
	return {
		resolution,
		fitness,
		indices: new Uint32Array(indices),
		gridIndices: new Uint32Array(gridIndices),
	};
};
