import { fireEvent, type render, waitFor } from "@solidjs/testing-library";
import { expect, vi } from "vitest";
import * as loader from "../load-3d-visualizer";
import { ThreeLandscapeRenderer } from "../three-landscape-renderer";
import { Visualizer3D } from "../visualizer-3d";

export const createRendererMock = () => ({
	updateLandscape: vi.fn(),
	updatePopulation: vi.fn(),
	setWireframe: vi.fn(),
	restoreCamera: vi.fn(),
	resetCamera: vi.fn(),
	dispose: vi.fn(),
});

export function mock3DVisualizer(
	renderer: ReturnType<typeof createRendererMock>,
) {
	// biome-ignore lint/complexity/useArrowFunction: Vitest 4 invokes this constructor mock with new.
	vi.mocked(ThreeLandscapeRenderer).mockImplementation(function () {
		return renderer as unknown as ThreeLandscapeRenderer;
	});
	vi.spyOn(loader, "load3DVisualizer").mockResolvedValue({ Visualizer3D });
}

export const open3D = async (view: ReturnType<typeof render>) => {
	fireEvent.click(view.getByRole("button", { name: "3D" }));
	await waitFor(() => expect(ThreeLandscapeRenderer).toHaveBeenCalled());
	const settings = view.container.querySelector(".view-settings");
	if (!settings?.hasAttribute("open"))
		fireEvent.click(view.getByText("3D表示設定"));
};
