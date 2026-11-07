import {
	Color,
	type Mesh,
	type Scene,
	SRGBColorSpace,
	WebGLRenderer,
	type WebGLRendererParameters,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { getFitnessColor } from "./fitness-colors";
import { createLandscape } from "./landscape";
import { ThreeLandscapeRenderer } from "./three-landscape-renderer";

const draw = vi.hoisted(() => vi.fn());

vi.unmock("./three-landscape-renderer");
vi.mock("three", async (importOriginal) => ({
	...(await importOriginal<typeof import("three")>()),
	WebGLRenderer: vi.fn(),
}));

let renderer: ThreeLandscapeRenderer | undefined;
let frame: FrameRequestCallback | undefined;

const tick = (time: number) => {
	const callback = frame;
	frame = undefined;
	callback?.(time);
};

function createView() {
	const host = document.createElement("div");
	renderer = new ThreeLandscapeRenderer(host, vi.fn(), vi.fn());
	renderer.restoreCamera({ position: [5, -4, 3.3], target: [0, 0, 0.35] });
	tick(0);
	return host;
}

beforeEach(() => {
	// biome-ignore lint/complexity/useArrowFunction: Vitest 4 invokes this constructor mock with new.
	vi.mocked(WebGLRenderer).mockImplementation(function (
		options?: WebGLRendererParameters,
	) {
		return {
			domElement: options?.canvas,
			setPixelRatio: vi.fn(),
			setSize: vi.fn(),
			render: draw,
			dispose: vi.fn(),
			forceContextLoss: vi.fn(),
		} as unknown as WebGLRenderer;
	});
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		arc: vi.fn(),
		stroke: vi.fn(),
		fill: vi.fn(),
	} as unknown as CanvasRenderingContext2D);
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			disconnect() {}
		},
	);
	vi.stubGlobal(
		"requestAnimationFrame",
		vi.fn((callback: FrameRequestCallback) => {
			frame = callback;
			return 1;
		}),
	);
	vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
	renderer?.dispose();
	renderer = undefined;
	frame = undefined;
	vi.restoreAllMocks();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

test("updates surface colors, heights, markers and axis ticks when the scale changes", () => {
	const landscape = createLandscape("sphere", { min: -10, max: 10 });
	const individual = { x: 5, y: 0, fitness: 25 };
	const best = { x: 0, y: 5, fitness: 25 };
	const host = document.createElement("div");
	renderer = new ThreeLandscapeRenderer(host, vi.fn(), vi.fn());
	renderer.updateLandscape(landscape, "linear", 4);
	renderer.updatePopulation([individual, best], best);
	frame?.(0);
	const scene: Scene = draw.mock.lastCall?.[0];
	const surface = scene.getObjectByProperty("type", "Mesh") as Mesh;
	const geometry = surface.geometry;
	const positions = geometry.getAttribute("position");
	const colors = geometry.getAttribute("color");
	const linearPositions = Array.from(positions.array);
	const linearColors = Array.from(colors.array);
	const vertex = 3 * 5 + 2; // x = 5, y = 0, fitness = 25
	const population = scene.children.filter(
		(object) => object.type === "Points",
	);
	const markerHeights = () =>
		population.map((object) =>
			(object as Mesh).geometry.getAttribute("position").getZ(0),
		);
	const axes = () =>
		Array.from(
			host.querySelectorAll('[title^="評価値 = "]'),
			(label) => label.textContent,
		);
	expect(positions.getZ(vertex)).toBeCloseTo(25 / 200);
	expect(markerHeights()).toEqual([25 / 200, 25 / 200, 0]);
	expect(axes()).toEqual(["0", "50", "100", "150", "200"]);

	renderer.restoreCamera({ position: [4, -3, 2], target: [0, 0, 0.5] });
	frame?.(0);
	const cameraPosition = draw.mock.lastCall?.[1].position.clone();
	renderer.updateLandscape(landscape, "logarithmic", 4);
	frame?.(0);
	const height = Math.log1p(25) / Math.log1p(200);
	expect(positions.getZ(vertex)).toBeCloseTo(height);
	for (const markerHeight of markerHeights().slice(0, 2)) {
		expect(markerHeight).toBeCloseTo(height);
	}
	expect(Array.from(colors.array)).not.toEqual(linearColors);
	const rgb = getFitnessColor(height);
	const color = new Color().setRGB(
		rgb[0] / 255,
		rgb[1] / 255,
		rgb[2] / 255,
		SRGBColorSpace,
	);
	expect(colors.getX(vertex)).toBeCloseTo(color.r);
	expect(colors.getY(vertex)).toBeCloseTo(color.g);
	expect(colors.getZ(vertex)).toBeCloseTo(color.b);
	expect(axes()).toEqual(["0", "2.77", "13.18", "52.38", "200"]);
	expect(draw.mock.lastCall?.[1].position).toEqual(cameraPosition);
	expect(surface.geometry).toBe(geometry);

	renderer.updateLandscape(landscape, "linear", 4);
	expect(Array.from(positions.array)).toEqual(linearPositions);
	expect(Array.from(colors.array)).toEqual(linearColors);
	expect(markerHeights()).toEqual([25 / 200, 25 / 200, 0]);
	expect(axes()).toEqual(["0", "50", "100", "150", "200"]);
});

test("resets the camera over 200ms and stops requesting frames when settled", () => {
	vi.spyOn(performance, "now").mockReturnValue(0);
	createView();
	renderer?.resetCamera(true);
	tick(100);
	const position = draw.mock.lastCall?.[1].position.clone();
	expect(position.x).toBeGreaterThan(3);
	expect(position.x).toBeLessThan(5);
	tick(200);
	expect(draw.mock.lastCall?.[1].position.x).toBeCloseTo(3);
	expect(draw.mock.lastCall?.[1].position.y).toBeCloseTo(-4);
	expect(frame).toBeUndefined();
});

test.each([false, true])(
	"uses pointer inertia only when reduced motion is %s",
	(reduced) => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: reduced,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
		);
		const host = createView();
		const canvas = host.querySelector("canvas");
		if (!canvas) throw new Error("Canvas is missing");
		Object.defineProperty(canvas, "clientHeight", { value: 300 });
		canvas.setPointerCapture = vi.fn();
		canvas.releasePointerCapture = vi.fn();
		canvas.dispatchEvent(
			new MouseEvent("pointerdown", { button: 0, clientX: 100, clientY: 100 }),
		);
		document.dispatchEvent(
			new MouseEvent("pointermove", { clientX: 120, clientY: 110 }),
		);
		document.dispatchEvent(new MouseEvent("pointerup"));
		tick(16);
		const position = draw.mock.lastCall?.[1].position.clone();
		tick(32);
		const distance = draw.mock.lastCall?.[1].position.distanceTo(position);
		if (reduced) expect(distance).toBe(0);
		else expect(distance).toBeGreaterThan(0);
		for (let i = 3; frame && i < 120; i++) tick(i * 16);
		expect(frame).toBeUndefined();
	},
);

test("interrupts a reset on keyboard input and keeps keyboard camera changes immediate", () => {
	vi.spyOn(performance, "now").mockReturnValue(0);
	const host = createView();
	const canvas = host.querySelector("canvas");
	if (!canvas) throw new Error("Canvas is missing");
	Object.defineProperty(canvas, "clientHeight", { value: 300 });
	renderer?.resetCamera(true);
	tick(100);
	const position = draw.mock.lastCall?.[1].position.clone();
	canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
	tick(200);
	expect(draw.mock.lastCall?.[1].position.distanceTo(position)).toBeLessThan(
		1e-10,
	);
	canvas.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight" }));
	tick(216);
	expect(draw.mock.lastCall?.[1].position.distanceTo(position)).toBeGreaterThan(
		0,
	);
	expect(frame).toBeUndefined();
	renderer?.resetCamera();
	tick(232);
	expect(draw.mock.lastCall?.[1].position.x).toBeCloseTo(3);
	expect(frame).toBeUndefined();
});

test("honors reduced motion changes during a reset and removes its listener on disposal", () => {
	const listeners = new Set<() => void>();
	const query = {
		matches: false,
		addEventListener: (_type: string, listener: () => void) =>
			listeners.add(listener),
		removeEventListener: (_type: string, listener: () => void) =>
			listeners.delete(listener),
	};
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => query),
	);
	vi.spyOn(performance, "now").mockReturnValue(0);
	createView();
	renderer?.resetCamera(true);
	tick(100);
	query.matches = true;
	for (const listener of listeners) listener();
	tick(116);
	expect(draw.mock.lastCall?.[1].position.x).toBeCloseTo(3);
	expect(frame).toBeUndefined();
	renderer?.restoreCamera({ position: [5, -4, 3.3], target: [0, 0, 0.35] });
	renderer?.resetCamera(true);
	tick(132);
	expect(draw.mock.lastCall?.[1].position.x).toBeCloseTo(3);
	expect(frame).toBeUndefined();
	renderer?.dispose();
	expect(listeners.size).toBe(0);
});

test("disposes shared scene resources once and cancels pending rendering", () => {
	const host = createView();
	renderer?.updateLandscape(
		createLandscape("sphere", { min: -10, max: 10 }),
		"linear",
		4,
	);
	tick(16);
	const scene: Scene = draw.mock.lastCall?.[0];
	const disposables = new Set<{ dispose(): void }>();
	scene.traverse((object) => {
		const mesh = object as Mesh;
		if (!mesh.geometry) return;
		disposables.add(mesh.geometry);
		const materials = Array.isArray(mesh.material)
			? mesh.material
			: [mesh.material];
		for (const material of materials) {
			disposables.add(material);
			if ("map" in material && material.map)
				disposables.add(material.map as { dispose(): void });
		}
	});
	const spies = Array.from(disposables, (resource) =>
		vi.spyOn(resource, "dispose"),
	);
	renderer?.resetCamera(true);
	renderer?.dispose();
	renderer?.dispose();
	for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
	expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
	expect(host.children).toHaveLength(0);
	const drawCount = draw.mock.calls.length;
	tick(32);
	expect(draw).toHaveBeenCalledTimes(drawCount);
});

test("cleans up controls and WebGL when camera initialization fails", () => {
	const host = document.createElement("div");
	const query = {
		matches: false,
		addEventListener: vi.fn(() => {
			throw new Error("motion listener failed");
		}),
		removeEventListener: vi.fn(),
	};
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => query),
	);
	const disposeControls = vi.spyOn(OrbitControls.prototype, "dispose");
	expect(() => new ThreeLandscapeRenderer(host, vi.fn(), vi.fn())).toThrow(
		"motion listener failed",
	);
	const webgl = vi.mocked(WebGLRenderer).mock.results.at(-1)
		?.value as WebGLRenderer;
	expect(disposeControls).toHaveBeenCalledTimes(1);
	expect(query.removeEventListener).toHaveBeenCalledTimes(1);
	expect(webgl.dispose).toHaveBeenCalledTimes(1);
	expect(webgl.forceContextLoss).toHaveBeenCalledTimes(1);
	expect(host.children).toHaveLength(0);
});
