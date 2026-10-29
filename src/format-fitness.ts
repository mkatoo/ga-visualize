export const formatFitness = (value: number) =>
	value !== 0 && (Math.abs(value) < 0.0001 || Math.abs(value) >= 10_000)
		? value.toExponential(3)
		: value.toFixed(4);
