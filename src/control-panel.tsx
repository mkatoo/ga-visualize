import type { FunctionType } from "./objective-functions";
import { OBJECTIVE_FUNCTIONS } from "./objective-functions";

interface ControlPanelProps {
	// Control states
	isRunning: boolean;
	functionType: FunctionType;
	populationSize: number;
	generations: number;
	animationSpeed: number;
	
	// Event handlers
	onStart: () => void;
	onStop: () => void;
	onStep: () => void;
	onReset: () => void;
	onFunctionTypeChange: (event: Event) => void;
	onPopulationSizeChange: (event: Event) => void;
	onPopulationSizeBlur: (event: Event) => void;
	onGenerationsChange: (event: Event) => void;
	onGenerationsBlur: (event: Event) => void;
	onSpeedChange: (event: Event) => void;
	
	// Constants
	minPopulationSize: number;
	maxPopulationSize: number;
	minGenerations: number;
	maxGenerations: number;
}

export function ControlPanel(props: ControlPanelProps) {
	return (
		<div class="controls">
			<div class="button-group">
				<button
					type="button"
					class="btn btn-primary"
					onClick={props.onStart}
					disabled={props.isRunning}
				>
					開始
				</button>
				<button
					type="button"
					class="btn btn-secondary"
					onClick={props.onStop}
					disabled={!props.isRunning}
				>
					停止
				</button>
				<button
					type="button"
					class="btn btn-secondary"
					onClick={props.onStep}
					disabled={props.isRunning}
				>
					ステップ
				</button>
				<button type="button" class="btn btn-outline" onClick={props.onReset}>
					リセット
				</button>
			</div>

			<div class="parameter-controls">
				<div class="parameter-group">
					<label for="functionType">最適化関数:</label>
					<select
						id="functionType"
						value={props.functionType}
						onChange={props.onFunctionTypeChange}
						disabled={props.isRunning}
					>
						{Object.entries(OBJECTIVE_FUNCTIONS).map(([key, func]) => (
							<option value={key}>{func.name}</option>
						))}
					</select>
				</div>

				<div class="parameter-group">
					<label for="populationSize">
						個体数 ({props.minPopulationSize}-{props.maxPopulationSize}):
					</label>
					<input
						id="populationSize"
						type="number"
						min={props.minPopulationSize}
						max={props.maxPopulationSize}
						value={props.populationSize}
						onInput={props.onPopulationSizeChange}
						onBlur={props.onPopulationSizeBlur}
						disabled={props.isRunning}
					/>
				</div>

				<div class="parameter-group">
					<label for="generations">
						世代数 ({props.minGenerations}-{props.maxGenerations}):
					</label>
					<input
						id="generations"
						type="number"
						min={props.minGenerations}
						max={props.maxGenerations}
						value={props.generations}
						onInput={props.onGenerationsChange}
						onBlur={props.onGenerationsBlur}
						disabled={props.isRunning}
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
					value={props.animationSpeed}
					onInput={props.onSpeedChange}
				/>
				<span>{props.animationSpeed}ms</span>
			</div>
		</div>
	);
}