import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	type JSX,
	onCleanup,
	Show,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { FITNESS_CHART_INSETS } from "../constants";
import type { Individual } from "../genetic-algorithm";
import {
	createLandscape,
	getDefaultHeightScale,
	type HeightScale,
} from "../landscape";
import { load3DVisualizer } from "../load-3d-visualizer";
import {
	type FunctionType,
	getObjectiveFunction,
} from "../objective-functions";
import type { CameraState } from "../three-landscape-renderer";
import { Visualizer } from "../visualizer";
import type { Visualizer3DProps } from "../visualizer-3d";
import { FitnessScale } from "./fitness-scale";
import { GenerationSummary, ResultDetails } from "./population-stats";

interface GAVisualizationProps {
	population: Individual[];
	bounds: { min: number; max: number };
	generation: number;
	averageFitness: number;
	bestIndividual: Individual | null;
	bestEver?: Individual | null;
	bestEverGeneration?: number;
	functionType: FunctionType;
	children?: JSX.Element;
	chart?: JSX.Element;
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
	const [animateReset, setAnimateReset] = createSignal(false);
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
	const colorScale = createMemo(() =>
		mode() === "3d"
			? {
					...landscape().colorScale,
					logarithmic: heightScale() === "logarithmic",
				}
			: landscape().colorScale,
	);
	const optimum = () => getObjectiveFunction(props.functionType).optimum;
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
			<fieldset class="visualization-toolbar" aria-label="表示ツールバー">
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
							disabled={!threeComponent()}
							onClick={(event) => {
								setAnimateReset(event.detail > 0);
								setResetView((v) => v + 1);
							}}
						>
							視点リセット
						</button>
					</Show>
				</div>
				{props.children}
			</fieldset>
			<GenerationSummary
				generation={props.generation}
				bestIndividual={props.bestIndividual}
				averageFitness={props.averageFitness}
				bestEver={props.bestEver ?? props.bestIndividual}
			/>
			<Show when={error()}>
				<output class="visualization-error">{error()}</output>
			</Show>
			<div
				class="visualization-content"
				style={{
					"--chart-padding-top": `${FITNESS_CHART_INSETS.top}px`,
					"--chart-padding-bottom": `${FITNESS_CHART_INSETS.bottom}px`,
				}}
			>
				<div class="landscape-panel visualizer">
					<h2 class="landscape-heading">地形と個体分布</h2>
					<div class="landscape-view">
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
							<Show
								when={threeComponent()}
								fallback={
									<output class="three-loading">
										3D表示を読み込んでいます…
									</output>
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
										animateReset={animateReset()}
										camera={camera}
										onCameraChange={(state: CameraState) => {
											camera = state;
										}}
										onError={fail}
									/>
								)}
							</Show>
						</Show>
						<FitnessScale scale={colorScale()} />
					</div>
					<div class="landscape-annotations">
						<p class="three-help">
							<Show
								when={mode() === "3d"}
								fallback="地形の色は評価値を示します。小さいほど良い解です。"
							>
								<span class="three-help-mouse">
									ドラッグで回転・ホイールでズーム・右ドラッグで移動。
								</span>
								<span class="three-help-touch">
									タッチは1本指で回転、2本指でズーム・移動。
								</span>
							</Show>
						</p>
						<section class="population-legend" aria-label="個体の凡例">
							<span>
								<i class="population-dot" />
								個体
							</span>
							<span>
								<i class="population-dot best" />
								最良個体
							</span>
							<span>
								<i class="optimum-symbol" />
								既知の最適解 ({optimum().x}, {optimum().y})
							</span>
						</section>
						<details class="view-settings" hidden={mode() !== "3d"}>
							<summary class="settings-toggle">
								<span class="settings-title">3D表示設定</span>
							</summary>
							<p class="settings-help">
								3D表示の高さ・色・格子線を調整できます。
							</p>
							<div class="three-settings">
								<label>
									高さ・色の尺度
									<select
										value={heightScale()}
										onChange={(e) =>
											setHeightScale(e.currentTarget.value as HeightScale)
										}
									>
										<option value="linear">線形（評価値に比例）</option>
										<option value="logarithmic">
											対数（小さな評価値の違いを強調）
										</option>
									</select>
								</label>
								<label>
									曲面の分割数
									<select
										value={resolution()}
										onChange={(e) =>
											setResolution(Number(e.currentTarget.value))
										}
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
						</details>
					</div>
				</div>
				{props.chart}
			</div>
			<ResultDetails
				generation={props.generation}
				bestIndividual={props.bestIndividual}
				bestEver={props.bestEver ?? props.bestIndividual}
				bestEverGeneration={props.bestEverGeneration ?? props.generation}
			/>
		</div>
	);
}
