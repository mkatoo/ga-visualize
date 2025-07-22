export type FunctionType = "sphere" | "rosenbrock" | "ackley";

export interface ObjectiveFunction {
	name: string;
	fn: (x: number, y: number) => number;
	bounds: { min: number; max: number };
	contourLevels: number[];
}

export const OBJECTIVE_FUNCTIONS: Record<FunctionType, ObjectiveFunction> = {
	sphere: {
		name: "Sphere Function",
		fn: (x: number, y: number): number => x * x + y * y,
		bounds: { min: -10, max: 10 },
		contourLevels: [0.1, 0.25, 0.5, 1, 2, 4, 6, 9, 12, 16, 20, 25],
	},
	rosenbrock: {
		name: "Rosenbrock Function",
		fn: (x: number, y: number): number => {
			const a = 1;
			const b = 100;
			return (a - x) ** 2 + b * (y - x ** 2) ** 2;
		},
		bounds: { min: -2, max: 2 },
		contourLevels: [0.5, 1, 2, 4, 6, 10, 15, 25, 35, 50, 70, 100, 150, 200],
	},
	ackley: {
		name: "Ackley Function",
		fn: (x: number, y: number): number => {
			const a = 20;
			const b = 0.2;
			const c = 2 * Math.PI;
			return (
				-a * Math.exp(-b * Math.sqrt((x * x + y * y) / 2)) -
				Math.exp((Math.cos(c * x) + Math.cos(c * y)) / 2) +
				a +
				Math.E
			);
		},
		bounds: { min: -5, max: 5 },
		contourLevels: [0.5, 1, 2, 3, 5, 7, 10, 13, 16, 20],
	},
};

export const getObjectiveFunction = (type: FunctionType): ObjectiveFunction => {
	return OBJECTIVE_FUNCTIONS[type];
};
