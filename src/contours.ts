interface Point {
	x: number;
	y: number;
}

export interface Segment {
	start: Point;
	end: Point;
}

// Utility function for linear interpolation to find contour intersections
const interpolate = (
	x1: number,
	y1: number,
	v1: number,
	x2: number,
	y2: number,
	v2: number,
	level: number,
): Point | null => {
	if (!Number.isFinite(v1) || !Number.isFinite(v2) || v1 === v2) return null;
	// Classify vertices on the level consistently across neighboring cells.
	const startBelow = v1 < level;
	const endBelow = v2 < level;
	if (startBelow === endBelow) return null;
	const t = (level - v1) / (v2 - v1);
	if (t < 0 || t > 1) return null;
	return {
		x: x1 + t * (x2 - x1),
		y: y1 + t * (y2 - y1),
	};
};

// Finds contour line intersections for a specific level using marching squares algorithm
export const findContourIntersections = (
	grid: number[][],
	level: number,
	bounds: { min: number; max: number },
	resolution: number,
): Segment[] => {
	const { min, max } = bounds;
	const step = (max - min) / resolution;
	const segments: Segment[] = [];
	const addSegment = (start: Point, end: Point) => {
		if (Math.hypot(end.x - start.x, end.y - start.y) > step * 1e-9) {
			segments.push({ start, end });
		}
	};

	// グリッドの各セルを処理
	for (let i = 0; i < resolution; i++) {
		for (let j = 0; j < resolution; j++) {
			const x1 = min + i * step;
			const y1 = min + j * step;
			const x2 = min + (i + 1) * step;
			const y2 = min + (j + 1) * step;

			const v1 = grid[i][j]; // 左下
			const v2 = grid[i + 1][j]; // 右下
			const v3 = grid[i + 1][j + 1]; // 右上
			const v4 = grid[i][j + 1]; // 左上

			const intersections: Point[] = [];

			// 各辺で等高線との交点をチェック
			const bottom = interpolate(x1, y1, v1, x2, y1, v2, level);
			const right = interpolate(x2, y1, v2, x2, y2, v3, level);
			const top = interpolate(x2, y2, v3, x1, y2, v4, level);
			const left = interpolate(x1, y2, v4, x1, y1, v1, level);

			if (bottom) intersections.push(bottom);
			if (right) intersections.push(right);
			if (top) intersections.push(top);
			if (left) intersections.push(left);

			// 2つの交点がある場合、線分として追加
			if (intersections.length === 2) {
				addSegment(intersections[0], intersections[1]);
			}
			// 4つの交点がある場合は特殊ケース（サドルポイント）
			else if (intersections.length === 4) {
				// 対角線で結ぶ
				addSegment(intersections[0], intersections[1]);
				addSegment(intersections[2], intersections[3]);
			}
		}
	}

	return segments;
};
