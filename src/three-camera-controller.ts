import { type PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CAMERA_RESET_DURATION, easeOut } from "./motion";

export interface CameraState {
	position: [number, number, number];
	target: [number, number, number];
}

export class ThreeCameraController {
	private readonly controls: OrbitControls;
	private disposed = false;
	private motionQuery?: MediaQueryList;
	private pointerInput = false;
	private suppressCameraChange = false;
	private cameraTransition?: {
		position: Vector3;
		target: Vector3;
		startedAt: number;
	};

	constructor(
		private readonly camera: PerspectiveCamera,
		private readonly canvas: HTMLCanvasElement,
		private readonly onChange: (state: CameraState) => void,
		private readonly requestRender: () => void,
	) {
		this.controls = new OrbitControls(this.camera, this.canvas);
		try {
			this.controls.enableDamping = false;
			this.controls.dampingFactor = 0.2;
			this.controls.autoRotate = false;
			this.controls.minDistance = 1.2;
			this.controls.maxDistance = 12;
			this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
			this.controls.listenToKeyEvents(canvas);
			this.controls.addEventListener("change", this.cameraChanged);
			this.canvas.addEventListener("pointerdown", this.pointerStarted, true);
			this.canvas.addEventListener("wheel", this.pointerStarted, {
				capture: true,
				passive: true,
			});
			this.canvas.addEventListener("keydown", this.keyboardStarted, true);
			if (typeof window.matchMedia === "function") {
				this.motionQuery = window.matchMedia(
					"(prefers-reduced-motion: reduce)",
				);
				this.motionQuery.addEventListener(
					"change",
					this.motionPreferenceChanged,
				);
			}
		} catch (error) {
			this.dispose();
			throw error;
		}
	}
	private readonly cameraChanged = () => {
		if (this.disposed || this.suppressCameraChange) return;
		this.onChange({
			position: this.camera.position.toArray(),
			target: this.controls.target.toArray(),
		});
	};
	private readonly pointerStarted = () => {
		this.pointerInput = true;
		this.cameraTransition = undefined;
		if (this.controls) this.controls.enableDamping = !this.motionQuery?.matches;
	};

	private readonly keyboardStarted = () => {
		this.pointerInput = false;
		this.stopCameraMotion();
	};

	private readonly motionPreferenceChanged = () => {
		if (this.motionQuery?.matches) {
			const wasResetting = !!this.cameraTransition;
			this.stopCameraMotion();
			if (wasResetting) this.resetCamera();
		} else if (this.controls) {
			this.controls.enableDamping = this.pointerInput;
		}
	};

	private stopCameraMotion() {
		this.cameraTransition = undefined;
		if (!this.controls) return;
		// Clear OrbitControls' residual deltas without moving the visible camera.
		const position = this.camera.position.clone();
		const target = this.controls.target.clone();
		this.suppressCameraChange = true;
		this.controls.enableDamping = false;
		this.controls.update();
		this.camera.position.copy(position);
		this.controls.target.copy(target);
		this.controls.update();
		this.suppressCameraChange = false;
	}
	resetCamera(animate = false) {
		if (!this.controls || this.disposed) return;
		this.stopCameraMotion();
		if (animate && !this.motionQuery?.matches) {
			this.cameraTransition = {
				position: this.camera.position.clone(),
				target: this.controls.target.clone(),
				startedAt: performance.now(),
			};
			this.requestRender();
		} else {
			this.restoreCamera({ position: [3, -4, 3.3], target: [0, 0, 0.35] });
		}
	}

	restoreCamera(state: CameraState) {
		if (!this.controls || this.disposed) return;
		this.stopCameraMotion();
		this.camera.position.fromArray(state.position);
		this.controls.target.fromArray(state.target);
		this.controls.update();
		this.cameraChanged();
	}

	update(time: number): boolean {
		const transition = this.cameraTransition;
		if (transition && this.controls) {
			const progress = Math.min(
				1,
				(time - transition.startedAt) / CAMERA_RESET_DURATION,
			);
			const eased = easeOut(progress);
			this.camera.position.lerpVectors(
				transition.position,
				new Vector3(3, -4, 3.3),
				eased,
			);
			this.controls.target.lerpVectors(
				transition.target,
				new Vector3(0, 0, 0.35),
				eased,
			);
			if (progress >= 1) this.cameraTransition = undefined;
		}
		const moving =
			this.controls?.enableDamping || transition
				? this.controls?.update()
				: false;
		return !!this.cameraTransition || !!(moving && this.controls.enableDamping);
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.cameraTransition = undefined;
		this.motionQuery?.removeEventListener(
			"change",
			this.motionPreferenceChanged,
		);
		this.controls.removeEventListener("change", this.cameraChanged);
		this.controls.dispose();
		this.canvas.removeEventListener("pointerdown", this.pointerStarted, true);
		this.canvas.removeEventListener("wheel", this.pointerStarted, true);
		this.canvas.removeEventListener("keydown", this.keyboardStarted, true);
	}
}
