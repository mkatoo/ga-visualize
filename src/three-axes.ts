import {
	BufferAttribute,
	BufferGeometry,
	type Group,
	LineBasicMaterial,
	LineSegments,
	Vector3,
} from "three";
import {
	getHeightTickValue,
	type HeightScale,
	type Landscape,
} from "./landscape";
import { disposeGroup } from "./three-resources";

export interface AxisLabel {
	element: HTMLSpanElement;
	position: Vector3;
}

const tickFormat = (value: number) => {
	if (value !== 0 && (Math.abs(value) < 0.01 || Math.abs(value) >= 10000))
		return value.toExponential(1);
	return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(
		value,
	);
};

export function updateAxes(
	axes: Group,
	labelLayer: HTMLDivElement,
	landscape: Landscape,
	heightScale: HeightScale,
): AxisLabel[] {
	disposeGroup(axes);
	labelLayer.replaceChildren();
	const labels: AxisLabel[] = [];
	const vertices = [
		-1, -1.12, 0, 1, -1.12, 0, -1.12, -1, 0, -1.12, 1, 0, -1.12, -1.12, 0,
		-1.12, -1.12, 1.15,
	];
	const addLabel = (
		text: string,
		position: [number, number, number],
		title = text,
	) => {
		const element = document.createElement("span");
		element.textContent = text;
		element.title = title;
		labelLayer.append(element);
		labels.push({ element, position: new Vector3(...position) });
	};
	const { min, max } = landscape.bounds;
	for (let i = 0; i <= 4; i++) {
		const t = i / 4;
		const xy = t * 2 - 1;
		const value = min + t * (max - min);
		const fitness = getHeightTickValue(
			t,
			landscape.colorScale.maximum,
			heightScale,
		);
		vertices.push(
			xy,
			-1.12,
			0,
			xy,
			-1.17,
			0,
			-1.12,
			xy,
			0,
			-1.17,
			xy,
			0,
			-1.12,
			-1.12,
			t,
			-1.17,
			-1.12,
			t,
		);
		addLabel(tickFormat(value), [xy, -1.28, 0], `x = ${value}`);
		addLabel(tickFormat(value), [-1.28, xy, 0], `y = ${value}`);
		addLabel(tickFormat(fitness), [-1.27, -1.22, t], `評価値 = ${fitness}`);
	}
	addLabel("x", [1.2, -1.12, 0]);
	addLabel("y", [-1.12, 1.2, 0]);
	addLabel("評価値", [-1.12, -1.12, 1.3]);
	const geometry = new BufferGeometry().setAttribute(
		"position",
		new BufferAttribute(new Float32Array(vertices), 3),
	);
	axes.add(
		new LineSegments(geometry, new LineBasicMaterial({ color: "#475569" })),
	);
	return labels;
}
