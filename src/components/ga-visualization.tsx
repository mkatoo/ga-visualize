import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Individual } from "../genetic-algorithm";
import {
	createLandscape,
	getDefaultHeightScale,
	type HeightScale,
} from "../landscape";
import { load3DVisualizer } from "../load-3d-visualizer";
import type { FunctionType } from "../objective-functions";
import type { CameraState } from "../three-landscape-renderer";
import { Visualizer } from "../visualizer";
import type { Visualizer3DProps } from "../visualizer-3d";
import { FitnessScale } from "./fitness-scale";
import { PopulationStats } from "./population-stats";

interface GAVisualizationProps {
	population: Individual[];
	bounds: { min: number; max: number };
	generation: number;
	averageFitness: number;
	bestIndividual: Individual | null;
	functionType: FunctionType;
}

export function GAVisualization(props: GAVisualizationProps) {
	const [mode, setMode] = createSignal<"2d" | "3d">("2d");
	const [threeComponent, setThreeComponent] =
		createSignal<Component<Visualizer3DProps>>();
	const [error, setError] = createSignal("");
	const [heightScale, setHeightScale] = createSignal<HeightScale>("linear");
	const [wireframe, setWireframe] = createSignal(false);
	const [resolution, setResolution] = createSignal(100);
	const [resetView, setResetView] = createSignal(0);
	let camera: CameraState | undefined;
	let request = 0;
	const settings = createMemo(
		() => ({
			functionType: props.functionType,
			min: props.bounds.min,
			max: props.bounds.max,
		}),
		undefined,
		{
			equals: (a, b) =>
				a.functionType === b.functionType && a.min === b.min && a.max === b.max,
		},
	);
	const landscape = createMemo(() => {
		const { functionType, min, max } = settings();
		return createLandscape(functionType, { min, max });
	});
	createEffect(() => {
		setHeightScale(getDefaultHeightScale(landscape()));
		camera = undefined;
	});
	const fail = (reason: string) => {
		request++;
		setMode("2d");
		setError(`${reason} 2D表示に戻しました。3Dボタンで再試行できます。`);
	};
	const select3D = async () => {
		const current = ++request;
		setError("");
		setMode("3d");
		try {
			const module = await load3DVisualizer();
			if (request === current && mode() === "3d")
				setThreeComponent(() => module.Visualizer3D);
		} catch {
			if (request === current && mode() === "3d")
				fail("3D表示の読み込みに失敗しました。");
		}
	};
	onCleanup(() => request++);
	return (
		<div class="visualization-panel">
			<div class="view-toolbar">
				<fieldset class="view-toggle" aria-label="表示方式">
					<button
						type="button"
						aria-pressed={mode() === "2d"}
						onClick={() => {
							request++;
							setMode("2d");
						}}
					>
						2D
					</button>
					<button
						type="button"
						aria-pressed={mode() === "3d"}
						onClick={select3D}
					>
						3D
					</button>
				</fieldset>
				<Show when={mode() === "3d"}>
					<button
						type="button"
						class="view-reset"
						onClick={() => setResetView((v) => v + 1)}
					>
						視点リセット
					</button>
				</Show>
			</div>
			<Show when={error()}>
				<output class="visualization-error">{error()}</output>
			</Show>
			<div class="visualizer">
				<Show
					when={mode() === "3d"}
					fallback={
						<Visualizer
							population={props.population}
							bestIndividual={props.bestIndividual}
							landscape={landscape()}
						/>
					}
				>
					<div class="three-settings">
						<label>
							高さの尺度
							<select
								value={heightScale()}
								onChange={(e) =>
									setHeightScale(e.currentTarget.value as HeightScale)
								}
							>
								<option value="linear">線形</option>
								<option value="logarithmic">対数（log(1 + f)）</option>
							</select>
						</label>
						<label>
							曲面の分割数
							<select
								value={resolution()}
								onChange={(e) => setResolution(Number(e.currentTarget.value))}
							>
								<option value={100}>100（標準）</option>
								<option value={64}>64（軽量）</option>
							</select>
						</label>
						<label class="wireframe-toggle">
							<input
								type="checkbox"
								checked={wireframe()}
								onChange={(e) => setWireframe(e.currentTarget.checked)}
							/>
							格子線のみ
						</label>
					</div>
					<p class="height-scale-description">
						高さ:{" "}
						{heightScale() === "linear"
							? "評価値（線形尺度）"
							: "評価値（log(1 + f)尺度）"}
						。低いほど良い解です。
					</p>
					<Show
						when={threeComponent()}
						fallback={
							<output class="three-loading">3D表示を読み込んでいます…</output>
						}
					>
						{(component) => (
							<Dynamic
								component={component()}
								landscape={landscape()}
								population={props.population}
								bestIndividual={props.bestIndividual}
								heightScale={heightScale()}
								wireframe={wireframe()}
								resolution={resolution()}
								resetView={resetView()}
								camera={camera}
								onCameraChange={(state: CameraState) => {
									camera = state;
								}}
								onError={fail}
							/>
						)}
					</Show>
					<p class="three-help">
						ドラッグで回転・ホイールでズーム・右ドラッグで移動。タッチは1本指で回転、2本指でズーム・移動。
					</p>
				</Show>
				<section class="population-legend" aria-label="個体の凡例">
					<span>
						<i class="population-dot" />
						個体
					</span>
					<span>
						<i class="population-dot best" />
						最良個体
					</span>
					<Show when={mode() === "3d"}>
						<span>赤いリングは地形の裏でも表示</span>
					</Show>
				</section>
				<FitnessScale scale={landscape().colorScale} />
				<PopulationStats
					generation={props.generation}
					bestIndividual={props.bestIndividual}
					averageFitness={props.averageFitness}
				/>
			</div>
		</div>
	);
}
