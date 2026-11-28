/**
 * Videomapping of an output: its surfaces, each with its four corners on the
 * output (corner pin), an optional grid of points that bends it (mesh warp)
 * and the part of the picture it shows (input crop). A surface shows the
 * whole program of the output or one of its layers. Without surfaces the
 * output shows its program as it is.
 */

/** Most surfaces of an output */
export const MAX_SURFACES = 16;

/** Farthest a corner can go outside the output, in parts of its size */
export const CORNER_MARGIN = 0.5;

/** Smallest side of a crop, in parts of the picture */
export const MIN_CROP = 0.01;

/** Point in parts of the output or of the picture, from the top left */
export type MappingPoint = [number, number];

/** Corners from the top left, clockwise */
export type Corners = [MappingPoint, MappingPoint, MappingPoint, MappingPoint];

export interface Crop {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Fewest and most points of a side of a mesh */
export const MESH_POINTS = { min: 2, max: 9 } as const;

/**
 * Grid of points that bends a surface, by rows from the top left. The points
 * are in parts of the surface before the corners are applied: a regular grid
 * leaves it flat.
 */
export interface Mesh {
    columns: number;
    rows: number;
    points: MappingPoint[];
}

export interface MappingSurface {
    id: string;
    name: string;
    /** The whole program, or one layer by its index from the bottom */
    source: 'program' | number;
    corners: Corners;
    crop: Crop;
    mesh?: Mesh;
}

export const FULL_CORNERS: Corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
export const FULL_CROP: Crop = { x: 0, y: 0, width: 1, height: 1 };

const clamp = (value: unknown, low: number, high: number, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(low, Math.min(high, value)) * 100000) / 100000 : fallback;

function normalizeMesh(value: unknown): Mesh | undefined {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof Mesh, unknown>>;
    const side = (count: unknown): number | null => Number.isInteger(count) && (count as number) >= MESH_POINTS.min && (count as number) <= MESH_POINTS.max ? count as number : null;
    const columns = side(input.columns);
    const rows = side(input.rows);
    const points = Array.isArray(input.points) ? input.points as unknown[] : [];
    if (columns === null || rows === null || points.length !== columns * rows) {
        return undefined;
    }
    const regular = regularMesh(columns, rows);
    return {
        columns,
        rows,
        points: regular.points.map((fallback, index): MappingPoint => {
            const point = Array.isArray(points[index]) ? points[index] as unknown[] : [];
            return [clamp(point[0], -CORNER_MARGIN, 1 + CORNER_MARGIN, fallback[0]), clamp(point[1], -CORNER_MARGIN, 1 + CORNER_MARGIN, fallback[1])];
        })
    };
}

/** Grid that leaves a surface as it is */
export function regularMesh(columns: number, rows: number): Mesh {
    return {
        columns,
        rows,
        points: Array.from({ length: columns * rows }, (_, index): MappingPoint => [(index % columns) / (columns - 1), Math.floor(index / columns) / (rows - 1)])
    };
}

/** Cubic through four values, between the second and the third */
function spline(a: number, b: number, c: number, d: number, t: number): number {
    return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
}

/** Value of a smooth curve through the given ones, beyond the ends as a straight line */
function along(count: number, at: number, value: (index: number) => number): number {
    const position = Math.max(0, Math.min(1, at)) * (count - 1);
    const first = Math.min(count - 2, Math.floor(position));
    const get = (index: number): number => index < 0 ? 2 * value(0) - value(1) : index >= count ? 2 * value(count - 1) - value(count - 2) : value(index);
    return spline(get(first - 1), get(first), get(first + 1), get(first + 2), position - first);
}

/** Where a point of a flat surface goes through its mesh, both in parts of the surface */
export function meshPoint(mesh: Mesh | undefined, u: number, v: number): MappingPoint {
    if (mesh === undefined) {
        return [u, v];
    }
    const { columns, rows, points } = mesh;
    return [0, 1].map((axis) => along(rows, v, (row) => along(columns, u, (column) => points[row * columns + column][axis]))) as MappingPoint;
}

/** Reads the surfaces of a file or of a request: invalid ones are dropped */
export function normalizeSurfaces(value: unknown): MappingSurface[] {
    const surfaces: MappingSurface[] = [];
    const ids = new Set<string>();
    for (const item of Array.isArray(value) ? value.slice(0, MAX_SURFACES) : []) {
        const input = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof MappingSurface, unknown>>;
        if (typeof input.id !== 'string' || input.id === '' || ids.has(input.id)) {
            continue;
        }
        ids.add(input.id);
        const corners = Array.isArray(input.corners) ? input.corners as unknown[] : [];
        const crop = (typeof input.crop === 'object' && input.crop !== null ? input.crop : {}) as Partial<Record<keyof Crop, unknown>>;
        const x = clamp(crop.x, 0, 1 - MIN_CROP, 0);
        const y = clamp(crop.y, 0, 1 - MIN_CROP, 0);
        const mesh = normalizeMesh(input.mesh);
        surfaces.push({
            ...(mesh === undefined ? {} : { mesh }),
            id: input.id,
            name: typeof input.name === 'string' ? input.name.slice(0, 60) : '',
            source: Number.isInteger(input.source) && (input.source as number) >= 0 ? input.source as number : 'program',
            corners: FULL_CORNERS.map((full, index) => {
                const point = Array.isArray(corners[index]) ? corners[index] as unknown[] : [];
                return [clamp(point[0], -CORNER_MARGIN, 1 + CORNER_MARGIN, full[0]), clamp(point[1], -CORNER_MARGIN, 1 + CORNER_MARGIN, full[1])];
            }) as Corners,
            crop: { x, y, width: clamp(crop.width, MIN_CROP, 1 - x, 1 - x), height: clamp(crop.height, MIN_CROP, 1 - y, 1 - y) }
        });
    }
    return surfaces;
}

/**
 * Perspective transform taking the unit square onto the corners, as the
 * rows of a 3x3 matrix: [x, y, w] = matrix x [u, v, 1], the point being
 * x/w, y/w. Null when the corners do not make a drawable shape.
 */
export function homography(corners: Corners): [number, number, number, number, number, number, number, number, number] | null {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = corners;
    const dx1 = x1 - x2;
    const dx2 = x3 - x2;
    const dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2;
    const dy2 = y3 - y2;
    const dy3 = y0 - y1 + y2 - y3;
    const determinant = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(determinant) < 1e-9) {
        return null;
    }
    const g = (dx3 * dy2 - dx2 * dy3) / determinant;
    const h = (dx1 * dy3 - dx3 * dy1) / determinant;
    // A shape folded over itself would cross the horizon
    if (1 + g <= 0.01 || 1 + h <= 0.01 || 1 + g + h <= 0.01) {
        return null;
    }
    return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

type Matrix = NonNullable<ReturnType<typeof homography>>;

/** Point of the output where a point of the surface falls */
export function project(matrix: Matrix, [u, v]: MappingPoint): MappingPoint {
    const [a, b, c, d, e, f, g, h, i] = matrix;
    const w = g * u + h * v + i;
    return [(a * u + b * v + c) / w, (d * u + e * v + f) / w];
}

/** Point of the surface that falls on a point of the output */
export function unproject(matrix: Matrix, [x, y]: MappingPoint): MappingPoint {
    const [a, b, c, d, e, f, g, h, i] = matrix;
    // Inverse of the matrix, up to a factor that the division takes away
    const w = (d * h - e * g) * x + (b * g - a * h) * y + (a * e - b * d);
    return [((e * i - f * h) * x + (c * h - b * i) * y + (b * f - c * e)) / w, ((f * g - d * i) * x + (a * i - c * g) * y + (c * d - a * f)) / w];
}
