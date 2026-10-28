import {
	BufferAttribute,
	BufferGeometry,
	CanvasTexture,
	Color,
	DoubleSide,
	DynamicDrawUsage,
	Group,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Points,
	PointsMaterial,
	Scene,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MAX_POPULATION_SIZE } from "./constants";
import { getFitnessColor, getFitnessColorPosition } from "./fitness-colors";
import type { Individual } from "./genetic-algorithm";
import {
	createSurfaceGrid,
	getFitnessHeight,
	getHeightTickValue,
	getIndividualPosition,
	type HeightScale,
	type Landscape,
	type SurfaceGrid,
} from "./landscape";
import { getObjectiveFunction } from "./objective-functions";
import { VISUALIZATION_COLORS } from "./visualization-colors";

export interface CameraState {
	position: [number, number, number];
	target: [number, number, number];
}

interface AxisLabel {
	element: HTMLSpanElement;
	position: Vector3;
}

// Geometries, materials and maps may be shared by objects. Dispose each once.
const disposeGroup = (group: Group | Scene) => {
	const geometries = new Set<BufferGeometry>();
	const materials = new Set<
		MeshBasicMaterial | LineBasicMaterial | PointsMaterial
	>();
	const textures = new Set<CanvasTexture>();
	group.traverse((object) => {
		if (
			object instanceof Mesh ||
			object instanceof LineSegments ||
			object instanceof Points
		) {
			geometries.add(object.geometry);
			const objectMaterials = Array.isArray(object.material)
				? object.material
				: [object.material];
			for (const material of objectMaterials) {
				materials.add(material);
				if (material.map) textures.add(material.map);
			}
		}
	});
	for (const geometry of geometries) geometry.dispose();
	for (const material of materials) material.dispose();
	for (const texture of textures) texture.dispose();
	group.clear();
};

const createMarkerMaterial = (
	color: string,
	size: number,
	ring = false,
	cross = false,
) => {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = 64;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("個体マーカーを生成できませんでした。");
	ctx.beginPath();
	if (cross) {
		ctx.moveTo(14, 14);
		ctx.lineTo(50, 50);
		ctx.moveTo(50, 14);
		ctx.lineTo(14, 50);
	} else {
		ctx.arc(32, 32, 23, 0, Math.PI * 2);
	}
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = ring ? 10 : 9;
	ctx.stroke();
	if (ring || cross) {
		ctx.strokeStyle = color;
		ctx.lineWidth = 5;
		ctx.stroke();
	} else {
		ctx.fillStyle = color;
		ctx.fill();
	}
	const map = new CanvasTexture(canvas);
	map.colorSpace = SRGBColorSpace;
	return new PointsMaterial({
		map,
		size,
		sizeAttenuation: false,
		transparent: true,
		alphaTest: 0.1,
		depthTest: !ring && !cross,
		depthWrite: !ring && !cross,
		toneMapped: false,
	});
};

const tickFormat = (value: number) => {
	if (value !== 0 && (Math.abs(value) < 0.01 || Math.abs(value) >= 10000))
		return value.toExponential(1);
	return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(
		value,
	);
};

export class ThreeLandscapeRenderer {
	private readonly scene = new Scene();
	private readonly camera = new PerspectiveCamera(42, 1, 0.01, 100);
	private readonly terrain = new Group();
	private readonly axes = new Group();
	private readonly labelLayer = document.createElement("div");
	private labels: AxisLabel[] = [];
	private readonly renderer: WebGLRenderer;
	private controls?: OrbitControls;
	private observer?: ResizeObserver;
	private populationPoints?: Points<BufferGeometry, PointsMaterial>;
	private bestPoint?: Points<BufferGeometry, PointsMaterial>;
	private optimumPoint?: Points<BufferGeometry, PointsMaterial>;
	private surface?: Mesh<BufferGeometry, MeshBasicMaterial>;
	private gridLines?: LineSegments<BufferGeometry, LineBasicMaterial>;
	private surfaceGrid?: SurfaceGrid;
	private landscape?: Landscape;
	private heightScale: HeightScale = "linear";
	private wireframe = false;
	private population: Individual[] = [];
	private best: Individual | null = null;
	private frame: number | null = null;
	private disposed = false;

	constructor(
		private readonly host: HTMLElement,
		private readonly onCameraChange: (state: CameraState) => void,
		private readonly onError: (reason: string) => void,
	) {
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("webgl2", {
			antialias: true,
			alpha: false,
		});
		if (!context) throw new Error("この環境ではWebGL 2を利用できません。");
		this.renderer = new WebGLRenderer({ canvas, context, antialias: true });
		try {
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
			this.renderer.outputColorSpace = SRGBColorSpace;
			this.scene.background = new Color("#f8fafc");
			this.scene.add(this.terrain, this.axes);
			canvas.tabIndex = 0;
			canvas.setAttribute(
				"aria-label",
				"3D地形。ドラッグで回転、ホイールでズーム、矢印キーで移動",
			);
			canvas.addEventListener("webglcontextlost", this.contextLost);
			this.labelLayer.className = "three-axis-labels";
			this.labelLayer.setAttribute("aria-hidden", "true");
			host.append(canvas, this.labelLayer);
			// Set Z up before OrbitControls creates its internal coordinate transform.
			this.camera.up.set(0, 0, 1);
			this.camera.position.set(3, -4, 3.3);
			this.controls = new OrbitControls(this.camera, canvas);
			this.controls.enableDamping = false;
			this.controls.autoRotate = false;
			this.controls.minDistance = 1.2;
			this.controls.maxDistance = 12;
			this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
			this.controls.listenToKeyEvents(canvas);
			this.controls.addEventListener("change", this.cameraChanged);
			this.populationPoints = new Points(
				new BufferGeometry().setAttribute(
					"position",
					new BufferAttribute(
						new Float32Array(MAX_POPULATION_SIZE * 3),
						3,
					).setUsage(DynamicDrawUsage),
				),
				createMarkerMaterial(VISUALIZATION_COLORS.population, 9),
			);
			this.populationPoints.geometry.setDrawRange(0, 0);
			this.scene.add(this.populationPoints);
			this.bestPoint = new Points(
				new BufferGeometry().setAttribute(
					"position",
					new BufferAttribute(new Float32Array(3), 3).setUsage(
						DynamicDrawUsage,
					),
				),
				createMarkerMaterial(VISUALIZATION_COLORS.best, 15),
			);
			this.bestPoint.visible = false;
			this.bestPoint.renderOrder = 2;
			this.scene.add(this.bestPoint);
			const ring = new Points(
				this.bestPoint.geometry,
				createMarkerMaterial(VISUALIZATION_COLORS.best, 25, true),
			);
			ring.renderOrder = 10;
			this.bestPoint.add(ring);
			this.optimumPoint = new Points(
				new BufferGeometry().setAttribute(
					"position",
					new BufferAttribute(new Float32Array(3), 3),
				),
				createMarkerMaterial("#0f766e", 16, false, true),
			);
			this.optimumPoint.renderOrder = 9;
			this.optimumPoint.visible = false;
			this.scene.add(this.optimumPoint);
			this.observer = new ResizeObserver(this.resize);
			this.observer.observe(host);
			this.resize();
		} catch (error) {
			this.dispose();
			throw error;
		}
	}

	private readonly contextLost = (event: Event) => {
		event.preventDefault();
		if (!this.disposed) this.onError("WebGLの描画コンテキストが失われました。");
	};

	private readonly cameraChanged = () => {
		if (!this.controls || this.disposed) return;
		this.onCameraChange({
			position: this.camera.position.toArray(),
			target: this.controls.target.toArray(),
		});
		this.requestRender();
	};

	private readonly resize = () => {
		if (this.disposed) return;
		const { width, height } = this.host.getBoundingClientRect();
		this.renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
		this.camera.aspect = Math.max(width, 1) / Math.max(height, 1);
		this.camera.updateProjectionMatrix();
		this.requestRender();
	};

	private requestRender() {
		if (this.frame !== null || this.disposed) return;
		this.frame = requestAnimationFrame(() => {
			this.frame = null;
			if (this.disposed) return;
			try {
				this.renderer.render(this.scene, this.camera);
				const { width, height } = this.host.getBoundingClientRect();
				for (const label of this.labels) {
					const point = label.position.clone().project(this.camera);
					label.element.hidden =
						Math.abs(point.x) > 1 ||
						Math.abs(point.y) > 1 ||
						Math.abs(point.z) > 1;
					label.element.style.left = `${((point.x + 1) * width) / 2}px`;
					label.element.style.top = `${((1 - point.y) * height) / 2}px`;
				}
			} catch {
				this.onError("3Dの描画に失敗しました。");
			}
		});
	}

	updateLandscape(
		landscape: Landscape,
		scale: HeightScale,
		resolution: number,
	) {
		if (this.disposed) return;
		const changed = landscape !== this.landscape;
		const gridChanged = changed || this.surfaceGrid?.resolution !== resolution;
		if (!gridChanged && scale === this.heightScale) return;
		this.heightScale = scale;
		if (gridChanged) {
			const grid = createSurfaceGrid(landscape, resolution);
			this.surfaceGrid = grid;
			disposeGroup(this.terrain);
			this.landscape = landscape;
			const geometry = new BufferGeometry();
			geometry.setAttribute(
				"position",
				new BufferAttribute(new Float32Array(grid.fitness.length * 3), 3),
			);
			const colors = new Float32Array(grid.fitness.length * 3);
			const color = new Color();
			for (let i = 0; i < grid.fitness.length; i++) {
				const rgb = getFitnessColor(
					getFitnessColorPosition(grid.fitness[i], landscape.colorScale),
				);
				color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, SRGBColorSpace);
				color.toArray(colors, i * 3);
			}
			geometry.setAttribute("color", new BufferAttribute(colors, 3));
			geometry.setIndex(new BufferAttribute(grid.indices, 1));
			this.surface = new Mesh(
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
			this.gridLines = new LineSegments(
				lines,
				new LineBasicMaterial({
					color: "#334155",
					transparent: true,
					opacity: 0.15,
					depthWrite: false,
				}),
			);
			this.terrain.add(this.surface, this.gridLines);
		}
		if (!this.surface || !this.surfaceGrid) return;
		const positions = this.surface.geometry.getAttribute("position");
		for (let x = 0; x <= resolution; x++) {
			for (let y = 0; y <= resolution; y++) {
				const i = x * (resolution + 1) + y;
				positions.setXYZ(
					i,
					(2 * x) / resolution - 1,
					(2 * y) / resolution - 1,
					getFitnessHeight(
						this.surfaceGrid.fitness[i],
						landscape.colorScale.maximum,
						scale,
					),
				);
			}
		}
		positions.needsUpdate = true;
		this.surface.geometry.computeBoundingSphere();
		this.gridLines?.geometry.computeBoundingSphere();
		if (this.optimumPoint) {
			const optimum = getObjectiveFunction(landscape.functionType).optimum;
			this.optimumPoint.visible =
				optimum.x >= landscape.bounds.min &&
				optimum.x <= landscape.bounds.max &&
				optimum.y >= landscape.bounds.min &&
				optimum.y <= landscape.bounds.max;
			const position = this.optimumPoint.geometry.getAttribute("position");
			position.setXYZ(0, ...getIndividualPosition(optimum, landscape, scale));
			position.needsUpdate = true;
			this.optimumPoint.geometry.computeBoundingSphere();
		}
		this.updateAxes();
		this.updatePopulation(this.population, this.best);
		this.setWireframe(this.wireframe);
		if (changed) this.resetCamera();
		this.requestRender();
	}

	updatePopulation(population: Individual[], best: Individual | null) {
		this.population = population;
		this.best = best;
		if (
			!this.landscape ||
			!this.populationPoints ||
			!this.bestPoint ||
			this.disposed
		)
			return;
		const geometry = this.populationPoints.geometry;
		if (population.length > geometry.getAttribute("position").count) {
			geometry.dispose();
			geometry.setAttribute(
				"position",
				new BufferAttribute(
					new Float32Array(population.length * 3),
					3,
				).setUsage(DynamicDrawUsage),
			);
		}
		const positions = geometry.getAttribute("position");
		let count = 0;
		for (const individual of population) {
			if (individual === best) continue;
			positions.setXYZ(
				count++,
				...getIndividualPosition(individual, this.landscape, this.heightScale),
			);
		}
		positions.needsUpdate = true;
		geometry.setDrawRange(0, count);
		geometry.computeBoundingSphere();
		this.bestPoint.visible = best !== null;
		if (best) {
			const position = this.bestPoint.geometry.getAttribute("position");
			position.setXYZ(
				0,
				...getIndividualPosition(best, this.landscape, this.heightScale),
			);
			position.needsUpdate = true;
			this.bestPoint.geometry.computeBoundingSphere();
		}
		this.requestRender();
	}

	setWireframe(wireframe: boolean) {
		this.wireframe = wireframe;
		if (this.surface) this.surface.visible = !wireframe;
		if (this.gridLines)
			this.gridLines.material.opacity = wireframe ? 0.5 : 0.15;
		this.requestRender();
	}

	resetCamera() {
		this.restoreCamera({ position: [3, -4, 3.3], target: [0, 0, 0.35] });
	}

	restoreCamera(state: CameraState) {
		if (!this.controls || this.disposed) return;
		this.camera.position.fromArray(state.position);
		this.controls.target.fromArray(state.target);
		this.controls.update();
		this.cameraChanged();
	}

	private updateAxes() {
		if (!this.landscape) return;
		disposeGroup(this.axes);
		this.labelLayer.replaceChildren();
		this.labels = [];
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
			this.labelLayer.append(element);
			this.labels.push({ element, position: new Vector3(...position) });
		};
		const { min, max } = this.landscape.bounds;
		for (let i = 0; i <= 4; i++) {
			const t = i / 4;
			const xy = t * 2 - 1;
			const value = min + t * (max - min);
			const fitness = getHeightTickValue(
				t,
				this.landscape.colorScale.maximum,
				this.heightScale,
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
		this.axes.add(
			new LineSegments(geometry, new LineBasicMaterial({ color: "#475569" })),
		);
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		if (this.frame !== null) cancelAnimationFrame(this.frame);
		this.observer?.disconnect();
		this.controls?.removeEventListener("change", this.cameraChanged);
		this.controls?.dispose();
		this.renderer.domElement.removeEventListener(
			"webglcontextlost",
			this.contextLost,
		);
		disposeGroup(this.scene);
		this.renderer.dispose();
		this.renderer.forceContextLoss();
		this.renderer.domElement.remove();
		this.labelLayer.remove();
		this.labels = [];
	}
}
