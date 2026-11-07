import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DynamicDrawUsage,
	Group,
	type LineBasicMaterial,
	type LineSegments,
	type Mesh,
	type MeshBasicMaterial,
	PerspectiveCamera,
	Points,
	type PointsMaterial,
	Scene,
	SRGBColorSpace,
	WebGLRenderer,
} from "three";
import { MAX_POPULATION_SIZE } from "./constants";
import type { Individual } from "./genetic-algorithm";
import {
	createSurfaceGrid,
	getIndividualPosition,
	type HeightScale,
	type Landscape,
	type SurfaceGrid,
} from "./landscape";
import { getObjectiveFunction } from "./objective-functions";
import { type AxisLabel, updateAxes } from "./three-axes";
import {
	type CameraState,
	ThreeCameraController,
} from "./three-camera-controller";
import { createMarkerMaterial, disposeGroup } from "./three-resources";
import { createTerrainMeshes, updateTerrainMeshes } from "./three-terrain";
import { VISUALIZATION_COLORS } from "./visualization-colors";

export type { CameraState } from "./three-camera-controller";

export class ThreeLandscapeRenderer {
	private readonly scene = new Scene();
	private readonly camera = new PerspectiveCamera(42, 1, 0.01, 100);
	private readonly terrain = new Group();
	private readonly axes = new Group();
	private readonly labelLayer = document.createElement("div");
	private labels: AxisLabel[] = [];
	private readonly renderer: WebGLRenderer;
	private cameraController?: ThreeCameraController;
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
			this.cameraController = new ThreeCameraController(
				this.camera,
				canvas,
				this.cameraChanged,
				() => this.requestRender(),
			);

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

	private readonly cameraChanged = (state: CameraState) => {
		if (this.disposed) return;
		this.onCameraChange(state);
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
		this.frame = requestAnimationFrame((time) => {
			if (this.disposed) return;
			try {
				const moving = this.cameraController?.update(time);
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
				this.frame = null;
				if (moving) this.requestRender();
			} catch {
				this.frame = null;
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
			const meshes = createTerrainMeshes(grid);
			this.surface = meshes.surface;
			this.gridLines = meshes.gridLines;
			this.terrain.add(this.surface, this.gridLines);
		}
		if (!this.surface || !this.surfaceGrid) return;
		updateTerrainMeshes(
			this.surface,
			this.gridLines,
			this.surfaceGrid,
			landscape,
			scale,
			resolution,
		);
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

	resetCamera(animate = false) {
		this.cameraController?.resetCamera(animate);
	}
	restoreCamera(state: CameraState) {
		this.cameraController?.restoreCamera(state);
	}

	private updateAxes() {
		if (this.landscape)
			this.labels = updateAxes(
				this.axes,
				this.labelLayer,
				this.landscape,
				this.heightScale,
			);
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		if (this.frame !== null) cancelAnimationFrame(this.frame);
		this.observer?.disconnect();
		this.cameraController?.dispose();
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
