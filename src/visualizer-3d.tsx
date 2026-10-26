import { createEffect, on, onCleanup, onMount } from "solid-js";
import type { Individual } from "./genetic-algorithm";
import type { HeightScale, Landscape } from "./landscape";
import {
	type CameraState,
	ThreeLandscapeRenderer,
} from "./three-landscape-renderer";

export interface Visualizer3DProps {
	landscape: Landscape;
	population: Individual[];
	bestIndividual: Individual | null;
	heightScale: HeightScale;
	wireframe: boolean;
	resolution: number;
	resetView: number;
	camera?: CameraState;
	onCameraChange: (state: CameraState) => void;
	onError: (reason: string) => void;
}

export function Visualizer3D(props: Visualizer3DProps) {
	let host!: HTMLDivElement;
	let renderer: ThreeLandscapeRenderer | undefined;
	const reportError = (error: unknown) =>
		props.onError(
			error instanceof Error ? error.message : "3D表示に失敗しました。",
		);
	onCleanup(() => renderer?.dispose());
	onMount(() => {
		const savedCamera = props.camera;
		try {
			renderer = new ThreeLandscapeRenderer(
				host,
				props.onCameraChange,
				props.onError,
			);
			renderer.updateLandscape(
				props.landscape,
				props.heightScale,
				props.resolution,
			);
			if (savedCamera) renderer.restoreCamera(savedCamera);
		} catch (error) {
			reportError(error);
		}
	});
	createEffect(() => {
		const landscape = props.landscape;
		const scale = props.heightScale;
		const resolution = props.resolution;
		try {
			renderer?.updateLandscape(landscape, scale, resolution);
		} catch (error) {
			reportError(error);
		}
	});
	createEffect(() =>
		renderer?.updatePopulation(props.population, props.bestIndividual),
	);
	createEffect(() => renderer?.setWireframe(props.wireframe));
	createEffect(
		on(
			() => props.resetView,
			() => renderer?.resetCamera(),
			{ defer: true },
		),
	);
	return (
		<section
			ref={host}
			class="three-container"
			aria-label="最適化関数の3D地形と個体分布"
		/>
	);
}
