import {
	Color,
	type Mesh,
	type Scene,
	SRGBColorSpace,
	type WebGLRendererParameters,
} from "three";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { getFitnessColor } from "./fitness-colors";
import { createLandscape } from "./landscape";
import { ThreeLandscapeRenderer } from "./three-landscape-renderer";

const draw = vi.hoisted(() => vi.fn());

vi.unmock("./three-landscape-renderer");
vi.mock("three", async (importOriginal) => ({
	...(await importOriginal<typeof import("three")>()),
	WebGLRenderer: vi
		.fn()
		.mockImplementation((options: WebGLRendererParameters) => ({
			domElement: options.canvas,
			setPixelRatio: vi.fn(),
			setSize: vi.fn(),
			render: draw,
			dispose: vi.fn(),
			forceContextLoss: vi.fn(),
		})),
}));

let renderer: ThreeLandscapeRenderer | undefined;
let frame: FrameRequestCallback | undefined;

beforeEach(() => {
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
