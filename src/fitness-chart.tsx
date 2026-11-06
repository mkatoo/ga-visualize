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
const PLOT_LEFT = 72;
const PLOT_RIGHT_MARGIN = 20;
const PLOT_TOP = FITNESS_CHART_INSETS.top;
const fitnessNumberFormat = new Intl.NumberFormat("ja-JP", {
	maximumSignificantDigits: 3,
});

export function FitnessChart(props: FitnessChartProps) {
	const id = createUniqueId();
	const [width, setWidth] = createSignal(640);
	const [height, setHeight] = createSignal(CHART_HEIGHT);
	const [selection, setSelection] = createSignal<number>();
	const [scale, setScale] = createSignal<"linear" | "logarithmic">("linear");
	const latestGeneration = () =>
		Math.max(
			0,
			Math.min(props.bestFitness.length, props.averageFitness.length) - 1,
		);
	const selectedGeneration = () =>
		Math.max(
			0,
			Math.min(
				latestGeneration(),
				props.selectedGeneration ?? selection() ?? latestGeneration(),
			),
		);
	const selectGeneration = (value: number) => {
		if (!Number.isFinite(value)) return;
		const generation = Math.max(
			0,
			Math.min(latestGeneration(), Math.round(value)),
		);
		setSelection(generation);
		props.onSelectGeneration?.(generation);
	};
	let container!: HTMLDivElement;
	let observer: ResizeObserver | undefined;
	onMount(() => {
		const updateSize = (nextWidth: number, nextHeight: number) => {
			if (nextWidth > 0) setWidth(nextWidth);
			if (nextHeight > PLOT_TOP + FITNESS_CHART_INSETS.bottom)
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

	const plotWidth = () => Math.max(1, width() - PLOT_LEFT - PLOT_RIGHT_MARGIN);
	const plotBottom = () => height() - FITNESS_CHART_INSETS.bottom;
	const plotHeight = () => plotBottom() - PLOT_TOP;
	const maxGeneration = () => Math.max(1, props.totalGenerations);
	const maxFitness = createMemo(
		() => Math.max(0, ...props.bestFitness, ...props.averageFitness) || 1,
	);
	const logBounds = createMemo(() => {
		const positive = [...props.bestFitness, ...props.averageFitness].filter(
			(value) => value > 0,
		);
		return {
			min: Math.log10(Math.min(...positive, maxFitness())) - 1,
			max: Math.log10(maxFitness()),
		};
	});
	const formatTickFitness = (value: number) => {
		if (value === 0) return "0";
		return Math.abs(value) < 0.01 || Math.abs(value) >= 10_000
			? value.toExponential(1)
			: fitnessNumberFormat.format(value);
	};
	const x = (generation: number) =>
		PLOT_LEFT + (generation / maxGeneration()) * plotWidth();
	const y = (fitness: number) => {
		const bounds = logBounds();
		const position =
			scale() === "linear"
				? Math.max(0, fitness) / maxFitness()
				: fitness > 0
					? (Math.log10(fitness) - bounds.min) / (bounds.max - bounds.min)
					: 0;
		return plotBottom() - position * plotHeight();
	};
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
		if (
			pointerX < PLOT_LEFT ||
			pointerX > width() - PLOT_RIGHT_MARGIN ||
			pointerY < PLOT_TOP ||
			pointerY > plotBottom()
		)
			return;
		return ((pointerX - PLOT_LEFT) / plotWidth()) * maxGeneration();
	};
	const generationTicks = createMemo(() => {
		const intervals = Math.min(
			maxGeneration(),
			Math.max(1, Math.floor(plotWidth() / 80)),
		);
		return Array.from({ length: intervals + 1 }, (_, i) =>
			Math.round((i / intervals) * maxGeneration()),
		);
	});
	const fitnessTicks = createMemo(() => {
		const bounds = logBounds();
		return [0, 0.25, 0.5, 0.75, 1].map((position) =>
			scale() === "linear"
				? position * maxFitness()
				: position === 0
					? 0
					: 10 ** (bounds.min + position * (bounds.max - bounds.min)),
		);
	});
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
					}}
					onPointerUp={(event) => {
						if (!tap || tap.pointerId !== event.pointerId) return;
						const generation = moved(event) ? undefined : plotGeneration(event);
						cancelTap();
						if (generation !== undefined) selectGeneration(generation);
					}}
					onPointerCancel={cancelTap}
					onPointerLeave={cancelTap}
				>
					<title id={`${id}-title`}>遺伝的アルゴリズムの評価値推移グラフ</title>
					<desc id={`${id}-description`}>
						横軸は世代、縦軸は評価値の{scale() === "linear" ? "線形" : "対数"}
						目盛です。評価値は小さいほど良い解です。実線は最良評価値、破線は平均評価値を示します。
					</desc>
					<g class="chart-y-ticks">
						<For each={fitnessTicks()}>
							{(fitness) => (
								<g>
									<line
										x1={PLOT_LEFT}
										y1={y(fitness)}
										x2={x(maxGeneration())}
										y2={y(fitness)}
										class="chart-gridline"
									/>
									<text
										x={PLOT_LEFT - 10}
										y={y(fitness)}
										text-anchor="end"
										dominant-baseline="middle"
										class="axis-label"
									>
										{formatTickFitness(fitness)}
									</text>
								</g>
							)}
						</For>
					</g>
					<g class="chart-axes">
						<line
							x1={PLOT_LEFT}
							y1={PLOT_TOP}
							x2={PLOT_LEFT}
							y2={plotBottom()}
						/>
						<line
							x1={PLOT_LEFT}
							y1={plotBottom()}
							x2={x(maxGeneration())}
							y2={plotBottom()}
						/>
					</g>
					<g class="chart-x-ticks">
						<For each={generationTicks()}>
							{(generation) => (
								<g>
									<line
										x1={x(generation)}
										y1={plotBottom()}
										x2={x(generation)}
										y2={plotBottom() + 5}
										class="chart-tick"
									/>
									<text
										x={x(generation)}
										y={plotBottom() + 22}
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
												.map((fitness, i) => `${x(i)},${y(fitness)}`)
												.join(" ")}
											fill="none"
											stroke={item.color}
											stroke-width="2.5"
											stroke-dasharray={item.dash}
										/>
									</Show>
									<Show when={item.values().length > 0}>
										<circle
											cx={x(selectedGeneration())}
											cy={y(item.values()[selectedGeneration()] ?? 0)}
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
						x1={x(selectedGeneration())}
						x2={x(selectedGeneration())}
						y1={PLOT_TOP}
						y2={plotBottom()}
						stroke="#64748b"
						stroke-dasharray="3 4"
					/>
					<g class="chart-labels">
						<text x={PLOT_LEFT} y="13" class="axis-label">
							評価値{scale() === "logarithmic" ? "（対数）" : ""}
						</text>
						<text
							x={PLOT_LEFT + plotWidth() / 2}
							y={height() - 4}
							text-anchor="middle"
							class="axis-label"
						>
							世代
						</text>
					</g>
				</svg>
			</div>
			<div class="chart-annotations">
				<Show when={scale() === "logarithmic"}>
					<p class="chart-help" id={`${id}-scale-help`}>
						縦軸は対数目盛です。0は対数で表せないため、グラフの下端に表示します。
					</p>
				</Show>
				<ul class="chart-legend" aria-label="推移グラフの凡例">
					<For each={series}>
						{(item) => {
							const selectedFitness = () => {
								const value = item.values()[selectedGeneration()];
								return value === undefined ? "—" : formatFitness(value);
							};
							return (
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
									<span
										class="legend-value"
										title={item.values()[selectedGeneration()]?.toString()}
									>
										{selectedFitness()}
									</span>
								</li>
							);
						}}
					</For>
				</ul>
				<p class="chart-help">
					グラフをタップするか、上部の表示世代を指定すると、その世代の評価値を表示します。
				</p>
			</div>
		</figure>
	);
}
