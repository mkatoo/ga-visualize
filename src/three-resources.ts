import {
	type BufferGeometry,
	CanvasTexture,
	type Group,
	type LineBasicMaterial,
	LineSegments,
	Mesh,
	type MeshBasicMaterial,
	Points,
	PointsMaterial,
	type Scene,
	SRGBColorSpace,
} from "three";

// Geometries, materials and maps may be shared by objects. Dispose each once.
export const disposeGroup = (group: Group | Scene) => {
	const geometries = new Set<BufferGeometry>();
	const materials = new Set<
		MeshBasicMaterial | LineBasicMaterial | PointsMaterial
	>();
	const textures = new Set<CanvasTexture>();
	group.traverse((object) => {
		if (
			object instanceof Mesh ||
			object instanceof LineSegments ||
			object instanceof Points
		) {
			geometries.add(object.geometry);
			const objectMaterials = Array.isArray(object.material)
				? object.material
				: [object.material];
			for (const material of objectMaterials) {
				materials.add(material);
				if (material.map) textures.add(material.map);
			}
		}
	});
	for (const geometry of geometries) geometry.dispose();
	for (const material of materials) material.dispose();
	for (const texture of textures) texture.dispose();
	group.clear();
};

export const createMarkerMaterial = (
	color: string,
	size: number,
	ring = false,
	cross = false,
) => {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = 64;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("個体マーカーを生成できませんでした。");
	ctx.beginPath();
	if (cross) {
		ctx.moveTo(14, 14);
		ctx.lineTo(50, 50);
		ctx.moveTo(50, 14);
		ctx.lineTo(14, 50);
	} else {
		ctx.arc(32, 32, 23, 0, Math.PI * 2);
	}
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = ring ? 10 : 9;
	ctx.stroke();
	if (ring || cross) {
		ctx.strokeStyle = color;
		ctx.lineWidth = 5;
		ctx.stroke();
	} else {
		ctx.fillStyle = color;
		ctx.fill();
	}
	const map = new CanvasTexture(canvas);
	map.colorSpace = SRGBColorSpace;
	return new PointsMaterial({
		map,
		size,
		sizeAttenuation: false,
		transparent: true,
		alphaTest: 0.1,
		depthTest: !ring && !cross,
		depthWrite: !ring && !cross,
		toneMapped: false,
	});
};
