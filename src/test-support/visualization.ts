import { type render, within } from "@solidjs/testing-library";
import { vi } from "vitest";

export const displayedGeneration = (view: ReturnType<typeof render>) =>
	within(view.getByRole("region", { name: "表示中の世代の要約" })).getByText(
		/^(第\d+世代|履歴表示中：第\d+／\d+世代)$/,
	);

export function mockCanvasContext() {
	const context = {
		clearRect: vi.fn(),
		setTransform: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		strokeText: vi.fn(),
		fillText: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn(),
		drawImage: vi.fn(),
		putImageData: vi.fn(),
		createImageData: (width: number, height: number) => ({
			data: new Uint8ClampedArray(width * height * 4),
		}),
	};
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
		context as unknown as CanvasRenderingContext2D,
	);
}
