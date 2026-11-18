import {
	createMemo,
	createSignal,
	createUniqueId,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { FITNESS_CHART_INSETS } from "./constants";
import {
	createFitnessChartModel,
	type FitnessChartScale,
	formatFitnessTick,
} from "./fitness-chart-model";
import { formatFitness } from "./format-fitness";
import { VISUALIZATION_COLORS } from "./visualization-colors";

interface FitnessChartProps {
	bestFitness: number[];
	averageFitness: number[];
	totalGenerations: number;
	selectedGeneration?: number;
	onSelectGeneration?: (generation: number) => void;
}

const CHART_HEIGHT = 260;

export function FitnessChart(props: FitnessChartProps) {
	const id = createUniqueId();
	const [width, setWidth] = createSignal(640);
	const [height, setHeight] = createSignal(CHART_HEIGHT);
	const [selection, setSelection] = createSignal<number>();
	const [hoverGeneration, setHoverGeneration] = createSignal<number>();
	const [scale, setScale] = createSignal<FitnessChartScale>("linear");
	const selectedGeneration = () =>
		Math.max(
			0,
			Math.min(
				model().latestGeneration,
				props.selectedGeneration ?? selection() ?? model().latestGeneration,
			),
		);
	const preview = createMemo(() => {
		const generation = hoverGeneration();
		return generation !== undefined && generation <= model().latestGeneration
			? { generation, x: model().x(generation) }
			: undefined;
	});
	let container!: HTMLDivElement;
	let observer: ResizeObserver | undefined;
	onMount(() => {
		const updateSize = (nextWidth: number, nextHeight: number) => {
			if (nextWidth > 0) setWidth(nextWidth);
			if (nextHeight > FITNESS_CHART_INSETS.top + FITNESS_CHART_INSETS.bottom)
				setHeight(nextHeight);
		};
		updateSize(container.clientWidth, container.clientHeight);
		if (typeof ResizeObserver === "undefined") return;
		observer = new ResizeObserver(([entry]) => {
			if (entry) updateSize(entry.contentRect.width, entry.contentRect.height);
		});
		observer.observe(container);
	});
	onCleanup(() => observer?.disconnect());

	const model = createMemo(() =>
		createFitnessChartModel({
			bestFitness: props.bestFitness,
			averageFitness: props.averageFitness,
			totalGenerations: props.totalGenerations,
			width: width(),
			height: height(),
			scale: scale(),
		}),
	);
	let tap: { pointerId: number; x: number; y: number } | undefined;
	const cancelTap = () => {
		tap = undefined;
	};
	const moved = (event: PointerEvent) =>
		tap && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 8;
	const plotGeneration = (
		event: PointerEvent & { currentTarget: SVGSVGElement },
	) => {
		const bounds = event.currentTarget.getBoundingClientRect();
		if (bounds.width <= 0 || bounds.height <= 0) return;
		const pointerX = ((event.clientX - bounds.left) / bounds.width) * width();
		const pointerY = ((event.clientY - bounds.top) / bounds.height) * height();
		return model().generationAtPoint(pointerX, pointerY);
	};
	const series = [
		{
			label: "最良評価値",
			color: VISUALIZATION_COLORS.best,
			dash: undefined,
			values: () => props.bestFitness,
		},
		{
			label: "平均評価値",
			color: VISUALIZATION_COLORS.population,
			dash: "6 4",
			values: () => props.averageFitness,
		},
	];

	return (
		<figure class="fitness-chart">
			<figcaption class="chart-header">
				<h2>評価値の推移</h2>
				<span class="chart-generation">第{selectedGeneration()}世代</span>
				<div class="chart-scale">
					<span>縦軸</span>
					<fieldset
						class="view-toggle"
						aria-label="縦軸"
						aria-describedby={
							scale() === "logarithmic" ? `${id}-scale-help` : undefined
						}
					>
						<button
							type="button"
							aria-pressed={scale() === "linear"}
							onClick={() => setScale("linear")}
						>
							線形
						</button>
						<button
							type="button"
							aria-pressed={scale() === "logarithmic"}
							onClick={() => setScale("logarithmic")}
						>
							対数
						</button>
					</fieldset>
				</div>
			</figcaption>
			<div class="chart-container" ref={container}>
				<svg
					width="100%"
					height={height()}
					viewBox={`0 0 ${width()} ${height()}`}
					role="img"
					aria-labelledby={`${id}-title`}
					aria-describedby={`${id}-description`}
					onPointerDown={(event) => {
						cancelTap();
						if (
							event.isPrimary === false ||
							event.button !== 0 ||
							plotGeneration(event) === undefined
						)
							return;
						tap = {
							pointerId: event.pointerId,
							x: event.clientX,
							y: event.clientY,
						};
					}}
					onPointerMove={(event) => {
						if (tap?.pointerId === event.pointerId && moved(event)) cancelTap();
						if (event.pointerType === "mouse")
							setHoverGeneration(plotGeneration(event));
					}}
					onPointerUp={(event) => {
						if (!tap || tap.pointerId !== event.pointerId) return;
						const generation = moved(event) ? undefined : plotGeneration(event);
						cancelTap();
						if (generation !== undefined) {
							setSelection(generation);
							props.onSelectGeneration?.(generation);
						}
					}}
					onPointerCancel={cancelTap}
					onPointerLeave={() => {
						cancelTap();
						setHoverGeneration(undefined);
					}}
				>
					<title id={`${id}-title`}>遺伝的アルゴリズムの評価値推移グラフ</title>
					<desc id={`${id}-description`}>
						横軸は世代、縦軸は評価値の{scale() === "linear" ? "線形" : "対数"}
						目盛です。評価値は小さいほど良い解です。実線は最良評価値、破線は平均評価値を示します。
					</desc>
					<Show when={model().latestGeneration < model().maxGeneration}>
						<defs>
							<pattern
								id={`${id}-pending`}
								width="8"
								height="8"
								patternUnits="userSpaceOnUse"
							>
								<path
									class="chart-pending-stripe"
									d="M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6"
								/>
							</pattern>
						</defs>
						<rect
							fill={`url(#${id}-pending)`}
							x={model().availableRight}
							y={model().plotTop}
							width={model().x(model().maxGeneration) - model().availableRight}
							height={model().plotBottom - model().plotTop}
						/>
					</Show>
					<g class="chart-y-ticks">
						<For each={model().fitnessTicks}>
							{(fitness) => (
								<g>
									<line
										x1={model().plotLeft}
										y1={model().y(fitness)}
										x2={model().x(model().maxGeneration)}
										y2={model().y(fitness)}
										class="chart-gridline"
									/>
									<text
										x={model().plotLeft - 10}
										y={model().y(fitness)}
										text-anchor="end"
										dominant-baseline="middle"
										class="axis-label"
									>
										{formatFitnessTick(fitness)}
									</text>
								</g>
							)}
						</For>
					</g>
					<g class="chart-axes">
						<line
							x1={model().plotLeft}
							y1={model().plotTop}
							x2={model().plotLeft}
							y2={model().plotBottom}
						/>
						<line
							x1={model().plotLeft}
							y1={model().plotBottom}
							x2={model().x(model().maxGeneration)}
							y2={model().plotBottom}
						/>
					</g>
					<g class="chart-x-ticks">
						<For each={model().generationTicks}>
							{(generation) => (
								<g>
									<line
										x1={model().x(generation)}
										y1={model().plotBottom}
										x2={model().x(generation)}
										y2={model().plotBottom + 5}
										class="chart-tick"
									/>
									<text
										x={model().x(generation)}
										y={model().plotBottom + 22}
										text-anchor="middle"
										class="axis-label"
									>
										{generation}
									</text>
								</g>
							)}
						</For>
					</g>
					<g class="chart-data">
						<For each={series}>
							{(item) => (
								<g>
									<Show when={item.values().length > 1}>
										<polyline
											points={item
												.values()
												.map(
													(fitness, i) =>
														`${model().x(i)},${model().y(fitness)}`,
												)
												.join(" ")}
											fill="none"
											stroke={item.color}
											stroke-width="2.5"
											stroke-dasharray={item.dash}
										/>
									</Show>
									<Show when={item.values().length > 0}>
										<circle
											cx={model().x(selectedGeneration())}
											cy={model().y(item.values()[selectedGeneration()] ?? 0)}
											r="3.5"
											fill={item.color}
											stroke="white"
											stroke-width="1.5"
										>
											<title>{`${item.label}: ${item.values()[selectedGeneration()]}`}</title>
										</circle>
									</Show>
								</g>
							)}
						</For>
					</g>
					<line
						class="chart-selection"
						x1={model().x(selectedGeneration())}
						x2={model().x(selectedGeneration())}
						y1={model().plotTop}
						y2={model().plotBottom}
						stroke="#64748b"
						stroke-dasharray="3 4"
					/>
					<g class="chart-labels">
						<text x={model().plotLeft} y="13" class="axis-label">
							評価値{scale() === "logarithmic" ? "（対数）" : ""}
						</text>
						<text
							x={model().plotLeft + model().plotWidth / 2}
							y={height() - 4}
							text-anchor="middle"
							class="axis-label"
						>
							世代
						</text>
					</g>
					<Show when={preview()}>
						{(point) => (
							<line
								class="chart-preview-line"
								x1={point().x}
								x2={point().x}
								y1={model().plotTop}
								y2={model().plotBottom}
							/>
						)}
					</Show>
					<Show when={model().latestGeneration >= 0}>
						<rect
							class="chart-hit-area"
							x={model().plotLeft}
							y={model().plotTop}
							width={model().availableRight - model().plotLeft}
							height={model().plotBottom - model().plotTop}
						/>
					</Show>
				</svg>
				<Show when={preview()}>
					{(point) => (
						<div
							class="chart-preview"
							aria-hidden="true"
							style={{ "--preview-x": `${point().x}px` }}
						>
							<strong>第{point().generation}世代</strong>
							<dl>
								<For each={series}>
									{(item) => (
										<div>
											<dt>{item.label}</dt>
											<dd>
												{formatFitness(item.values()[point().generation])}
											</dd>
										</div>
									)}
								</For>
							</dl>
						</div>
					)}
				</Show>
			</div>
			<div class="chart-annotations">
				<Show when={scale() === "logarithmic"}>
					<p class="chart-help" id={`${id}-scale-help`}>
						縦軸は対数目盛です。0は対数で表せないため、グラフの下端に表示します。
					</p>
				</Show>
				<ul class="chart-legend" aria-label="推移グラフの凡例">
					<For each={series}>
						{(item) => (
							<li class="legend-item">
								<span
									class="legend-line"
									style={{
										"border-top-color": item.color,
										"border-top-style": item.dash ? "dashed" : "solid",
									}}
									aria-hidden="true"
								/>
								<span>{item.label}</span>
							</li>
						)}
					</For>
				</ul>
				<p class="chart-help">
					結果がある世代をクリック・タップすると、その世代を表示します。
					<Show when={model().latestGeneration < model().maxGeneration}>
						網掛けは未実行です。
					</Show>
				</p>
			</div>
		</figure>
	);
}
