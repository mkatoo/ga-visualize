import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DoubleSide,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	SRGBColorSpace,
} from "three";
import { getFitnessColor, getFitnessColorPosition } from "./fitness-colors";
import {
	getFitnessHeight,
	type HeightScale,
	type Landscape,
	type SurfaceGrid,
} from "./landscape";

// The renderer owns these objects and disposes them through its terrain group.
export function createTerrainMeshes(grid: SurfaceGrid) {
	const geometry = new BufferGeometry();
	geometry.setAttribute(
		"position",
		new BufferAttribute(new Float32Array(grid.fitness.length * 3), 3),
	);
	geometry.setAttribute(
		"color",
		new BufferAttribute(new Float32Array(grid.fitness.length * 3), 3),
	);
	geometry.setIndex(new BufferAttribute(grid.indices, 1));
	const surface = new Mesh(
		geometry,
		new MeshBasicMaterial({
			vertexColors: true,
			side: DoubleSide,
			polygonOffset: true,
			polygonOffsetFactor: 1,
			polygonOffsetUnits: 1,
			toneMapped: false,
		}),
	);
	const lines = new BufferGeometry().setAttribute(
		"position",
		geometry.getAttribute("position"),
	);
	lines.setIndex(new BufferAttribute(grid.gridIndices, 1));
	const gridLines = new LineSegments(
		lines,
		new LineBasicMaterial({
			color: "#334155",
			transparent: true,
			opacity: 0.15,
			depthWrite: false,
		}),
	);
	return { surface, gridLines };
}

export function updateTerrainMeshes(
	surface: Mesh<BufferGeometry, MeshBasicMaterial>,
	gridLines: LineSegments<BufferGeometry, LineBasicMaterial> | undefined,
	grid: SurfaceGrid,
	landscape: Landscape,
	scale: HeightScale,
	resolution: number,
) {
	const positions = surface.geometry.getAttribute("position");
	const colors = surface.geometry.getAttribute("color");
	const color = new Color();
	const colorScale = {
		maximum: landscape.colorScale.maximum,
		logarithmic: scale === "logarithmic",
	};
	for (let x = 0; x <= resolution; x++) {
		for (let y = 0; y <= resolution; y++) {
			const i = x * (resolution + 1) + y;
			const fitness = grid.fitness[i];
			positions.setXYZ(
				i,
				(2 * x) / resolution - 1,
				(2 * y) / resolution - 1,
				getFitnessHeight(fitness, landscape.colorScale.maximum, scale),
			);
			const rgb = getFitnessColor(getFitnessColorPosition(fitness, colorScale));
			color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, SRGBColorSpace);
			colors.setXYZ(i, color.r, color.g, color.b);
		}
	}
	positions.needsUpdate = true;
	colors.needsUpdate = true;
	surface.geometry.computeBoundingSphere();
	gridLines?.geometry.computeBoundingSphere();
}
