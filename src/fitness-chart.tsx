import {
	createMemo,
	createSignal,
	createUniqueId,
	For,
	onCleanup,
	onMount,
	Show,
} from "solid-js";

interface FitnessChartProps {
	bestFitness: number[];
	averageFitness: number[];
	totalGenerations: number;
}

const CHART_HEIGHT = 260;
const PLOT_LEFT = 72;
const PLOT_RIGHT_MARGIN = 20;
const PLOT_TOP = 22;
const PLOT_BOTTOM = CHART_HEIGHT - 48;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const fitnessNumberFormat = new Intl.NumberFormat("ja-JP", {
	maximumSignificantDigits: 3,
});

export function FitnessChart(props: FitnessChartProps) {
	const id = createUniqueId();
	const [width, setWidth] = createSignal(640);
	let container!: HTMLDivElement;
	let observer: ResizeObserver | undefined;
	onMount(() => {
		const updateWidth = (nextWidth: number) => {
			if (nextWidth > 0) setWidth(nextWidth);
		};
		updateWidth(container.clientWidth);
		if (typeof ResizeObserver === "undefined") return;
		observer = new ResizeObserver(([entry]) => {
			if (entry) updateWidth(entry.contentRect.width);
		});
		observer.observe(container);
	});
	onCleanup(() => observer?.disconnect());

	const plotWidth = () => Math.max(1, width() - PLOT_LEFT - PLOT_RIGHT_MARGIN);
	const maxGeneration = () => Math.max(1, props.totalGenerations);
	const maxFitness = createMemo(
		() => Math.max(0, ...props.bestFitness, ...props.averageFitness) || 1,
	);
	const formatFitness = (value: number) => {
		if (value === 0) return "0";
		return maxFitness() < 0.01 || maxFitness() >= 10_000
			? value.toExponential(1)
			: fitnessNumberFormat.format(value);
	};
	const x = (generation: number) =>
		PLOT_LEFT + (generation / maxGeneration()) * plotWidth();
	const y = (fitness: number) =>
		PLOT_BOTTOM - (fitness / maxFitness()) * PLOT_HEIGHT;
	const generationTicks = createMemo(() => {
		const intervals = Math.min(
			maxGeneration(),
			Math.max(1, Math.floor(plotWidth() / 80)),
		);
		return Array.from({ length: intervals + 1 }, (_, i) =>
			Math.round((i / intervals) * maxGeneration()),
		);
	});
	const fitnessTicks = createMemo(() =>
		[0, 0.25, 0.5, 0.75, 1].map((position) => position * maxFitness()),
	);
	const series = [
		{
			label: "最良適応度",
			color: "#ff6b6b",
			dash: undefined,
			values: () => props.bestFitness,
		},
		{
			label: "平均適応度",
			color: "#4ecdc4",
			dash: "6 4",
			values: () => props.averageFitness,
		},
	];

	return (
		<figure class="fitness-chart">
			<figcaption class="chart-header">
				<h2>適応度の推移</h2>
				<p>小さいほど良い</p>
			</figcaption>
			<div class="chart-container" ref={container}>
				<svg
					width="100%"
					height={CHART_HEIGHT}
					viewBox={`0 0 ${width()} ${CHART_HEIGHT}`}
					role="img"
					aria-labelledby={`${id}-title`}
					aria-describedby={`${id}-description`}
				>
					<title id={`${id}-title`}>遺伝的アルゴリズムの適応度推移グラフ</title>
					<desc id={`${id}-description`}>
						横軸は世代、縦軸は適応度です。適応度は小さいほど良い解です。実線は最良適応度、破線は平均適応度を示します。
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
										{formatFitness(fitness)}
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
							y2={PLOT_BOTTOM}
						/>
						<line
							x1={PLOT_LEFT}
							y1={PLOT_BOTTOM}
							x2={x(maxGeneration())}
							y2={PLOT_BOTTOM}
						/>
					</g>
					<g class="chart-x-ticks">
						<For each={generationTicks()}>
							{(generation) => (
								<g>
									<line
										x1={x(generation)}
										y1={PLOT_BOTTOM}
										x2={x(generation)}
										y2={PLOT_BOTTOM + 5}
										class="chart-tick"
									/>
									<text
										x={x(generation)}
										y={PLOT_BOTTOM + 22}
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
											cx={x(item.values().length - 1)}
											cy={y(item.values().at(-1) ?? 0)}
											r="3.5"
											fill={item.color}
											stroke="white"
											stroke-width="1.5"
										>
											<title>{`${item.label}: ${item.values().at(-1)}`}</title>
										</circle>
									</Show>
								</g>
							)}
						</For>
					</g>
					<g class="chart-labels">
						<text x={PLOT_LEFT} y="13" class="axis-label">
							適応度
						</text>
						<text
							x={PLOT_LEFT + plotWidth() / 2}
							y={CHART_HEIGHT - 4}
							text-anchor="middle"
							class="axis-label"
						>
							世代
						</text>
					</g>
				</svg>
			</div>
			<div class="legend">
				<For each={series}>
					{(item) => (
						<div class="legend-item">
							<span
								class="legend-line"
								style={{
									"border-top-color": item.color,
									"border-top-style": item.dash ? "dashed" : "solid",
								}}
								aria-hidden="true"
							/>
							{item.label}
						</div>
					)}
				</For>
			</div>
		</figure>
	);
}
