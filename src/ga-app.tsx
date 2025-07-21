import { createSignal, onCleanup } from "solid-js";
import { DEFAULT_CONFIG, GeneticAlgorithm } from "./genetic-algorithm";
import { Visualizer } from "./visualizer";
import "./ga-app.css";

const MIN_POPULATION_SIZE = 1;
const MAX_POPULATION_SIZE = 1000;
const MIN_GENERATIONS = 1;
const MAX_GENERATIONS = 1000;

export function GAApp() {
	const [populationSize, setPopulationSize] = createSignal(100);
	const [generations, setGenerations] = createSignal(50);
	const [ga, setGA] = createSignal(new GeneticAlgorithm({
		...DEFAULT_CONFIG,
		populationSize: populationSize(),
		generations: generations()
	}));
	const [population, setPopulation] = createSignal(ga().getPopulation());
	const [statistics, setStatistics] = createSignal(ga().getStatistics());
	const [isRunning, setIsRunning] = createSignal(false);
	const [animationSpeed, setAnimationSpeed] = createSignal(500);

	let intervalId: number | null = null;

	const initializeGA = () => {
		ga().initializePopulation();
		setPopulation(ga().getPopulation());
		setStatistics(ga().getStatistics());
	};

	const step = () => {
		const canContinue = ga().evolve();
		setPopulation(ga().getPopulation());
		setStatistics(ga().getStatistics());

		if (!canContinue) {
			stop();
		}
	};

	const start = () => {
		if (isRunning()) return;

		setIsRunning(true);
		intervalId = setInterval(() => {
			step();
		}, animationSpeed());
	};

	const stop = () => {
		setIsRunning(false);
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	};

	const reset = () => {
		stop();
		initializeGA();
	};

	const handleSpeedChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const speed = parseInt(target.value);
		setAnimationSpeed(speed);

		if (isRunning()) {
			stop();
			start();
		}
	};

	const updateGAConfig = () => {
		const newGA = new GeneticAlgorithm({
			...DEFAULT_CONFIG,
			populationSize: populationSize(),
			generations: generations()
		});
		setGA(newGA);
		newGA.initializePopulation();
		setPopulation(newGA.getPopulation());
		setStatistics(newGA.getStatistics());
	};

	const validateAndSetPopulationSize = (value: string) => {
		const numValue = parseInt(value) || MIN_POPULATION_SIZE;
		const clampedValue = Math.max(MIN_POPULATION_SIZE, Math.min(MAX_POPULATION_SIZE, numValue));
		setPopulationSize(clampedValue);
		
		if (!isRunning()) {
			updateGAConfig();
		}
		
		return clampedValue;
	};

	const validateAndSetGenerations = (value: string) => {
		const numValue = parseInt(value) || MIN_GENERATIONS;
		const clampedValue = Math.max(MIN_GENERATIONS, Math.min(MAX_GENERATIONS, numValue));
		setGenerations(clampedValue);
		
		if (!isRunning()) {
			updateGAConfig();
		}
		
		return clampedValue;
	};

	const handlePopulationSizeChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		validateAndSetPopulationSize(target.value);
	};

	const handlePopulationSizeBlur = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const clampedValue = validateAndSetPopulationSize(target.value);
		target.value = clampedValue.toString();
	};

	const handleGenerationsChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		validateAndSetGenerations(target.value);
	};

	const handleGenerationsBlur = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const clampedValue = validateAndSetGenerations(target.value);
		target.value = clampedValue.toString();
	};

	onCleanup(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});

	initializeGA();

	return (
		<div class="ga-app">
			<header class="header">
				<h1>遺伝的アルゴリズム可視化</h1>
				<p>Sphere関数の最適化過程を可視化</p>
			</header>

			<div class="main-content">
				<div class="visualization-panel">
					<Visualizer
						population={population()}
						bounds={DEFAULT_CONFIG.bounds}
						generation={statistics().generation}
						averageFitness={
							statistics().averageFitness[
								statistics().averageFitness.length - 1
							] ?? 0
						}
						bestIndividual={statistics().currentBest}
					/>
				</div>

				<div class="control-panel">
					<div class="controls">
						<div class="button-group">
							<button
								type="button"
								class="btn btn-primary"
								onClick={start}
								disabled={isRunning()}
							>
								開始
							</button>
							<button
								type="button"
								class="btn btn-secondary"
								onClick={stop}
								disabled={!isRunning()}
							>
								停止
							</button>
							<button
								type="button"
								class="btn btn-secondary"
								onClick={step}
								disabled={isRunning()}
							>
								ステップ
							</button>
							<button type="button" class="btn btn-outline" onClick={reset}>
								リセット
							</button>
						</div>

						<div class="parameter-controls">
							<div class="parameter-group">
								<label for="populationSize">個体数 ({MIN_POPULATION_SIZE}-{MAX_POPULATION_SIZE}):</label>
								<input
									id="populationSize"
									type="number"
									min={MIN_POPULATION_SIZE}
									max={MAX_POPULATION_SIZE}
									value={populationSize()}
									onInput={handlePopulationSizeChange}
									onBlur={handlePopulationSizeBlur}
									disabled={isRunning()}
								/>
							</div>
							
							<div class="parameter-group">
								<label for="generations">世代数 ({MIN_GENERATIONS}-{MAX_GENERATIONS}):</label>
								<input
									id="generations"
									type="number"
									min={MIN_GENERATIONS}
									max={MAX_GENERATIONS}
									value={generations()}
									onInput={handleGenerationsChange}
									onBlur={handleGenerationsBlur}
									disabled={isRunning()}
								/>
							</div>
						</div>

						<div class="speed-control">
							<label for="speed">アニメーション速度:</label>
							<input
								id="speed"
								type="range"
								min="50"
								max="2000"
								step="50"
								value={animationSpeed()}
								onInput={handleSpeedChange}
							/>
							<span>{animationSpeed()}ms</span>
						</div>

						<div class="progress">
							<div class="progress-label">
								進行状況: {statistics().generation} /{" "}
								{generations()}
							</div>
							<div class="progress-bar">
								<div
									class="progress-fill"
									style={{
										width: `${(statistics().generation / generations()) * 100}%`,
									}}
								/>
							</div>
						</div>
					</div>

					<div class="fitness-chart">
						<h3>適応度の推移</h3>
						<div class="chart-container">
							<svg width="300" height="200" viewBox="0 0 300 200">
								<title>遺伝的アルゴリズムの適応度推移グラフ</title>
								<defs>
									<linearGradient
										id="bestGradient"
										x1="0%"
										y1="0%"
										x2="0%"
										y2="100%"
									>
										<stop
											offset="0%"
											style="stop-color:#ff6b6b;stop-opacity:0.3"
										/>
										<stop
											offset="100%"
											style="stop-color:#ff6b6b;stop-opacity:0.1"
										/>
									</linearGradient>
									<linearGradient
										id="avgGradient"
										x1="0%"
										y1="0%"
										x2="0%"
										y2="100%"
									>
										<stop
											offset="0%"
											style="stop-color:#4ecdc4;stop-opacity:0.3"
										/>
										<stop
											offset="100%"
											style="stop-color:#4ecdc4;stop-opacity:0.1"
										/>
									</linearGradient>
								</defs>

								<g class="chart-axes">
									<line x1="30" y1="170" x2="280" y2="170" stroke="#ddd" />
									<line x1="30" y1="20" x2="30" y2="170" stroke="#ddd" />
								</g>

								<g class="chart-data">
									{statistics().bestFitness.length > 1 && (
										<>
											<polyline
												points={statistics()
													.bestFitness.map((fitness, i) => {
														const x =
															30 + (i / (generations() - 1)) * 250;
														const maxFitness = Math.max(
															...statistics().averageFitness,
														);
														const y = 170 - (fitness / maxFitness) * 150;
														return `${x},${y}`;
													})
													.join(" ")}
												fill="none"
												stroke="#ff6b6b"
												stroke-width="2"
											/>
											<polyline
												points={statistics()
													.averageFitness.map((fitness, i) => {
														const x =
															30 + (i / (generations() - 1)) * 250;
														const maxFitness = Math.max(
															...statistics().averageFitness,
														);
														const y = 170 - (fitness / maxFitness) * 150;
														return `${x},${y}`;
													})
													.join(" ")}
												fill="none"
												stroke="#4ecdc4"
												stroke-width="2"
											/>
										</>
									)}
								</g>

								<g class="chart-labels">
									<text x="155" y="195" text-anchor="middle" class="axis-label">
										世代
									</text>
									<text
										x="15"
										y="100"
										text-anchor="middle"
										class="axis-label"
										transform="rotate(-90 15 100)"
									>
										適応度
									</text>
								</g>
							</svg>
							<div class="legend">
								<div class="legend-item">
									<span
										class="legend-color"
										style="background-color: #ff6b6b"
									></span>
									最良適応度
								</div>
								<div class="legend-item">
									<span
										class="legend-color"
										style="background-color: #4ecdc4"
									></span>
									平均適応度
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
