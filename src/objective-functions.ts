export type FunctionType = "sphere" | "rosenbrock";

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
};

export const getObjectiveFunction = (type: FunctionType): ObjectiveFunction => {
	return OBJECTIVE_FUNCTIONS[type];
};
