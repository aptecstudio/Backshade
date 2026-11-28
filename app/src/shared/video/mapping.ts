/**
 * Videomapping of an output: its surfaces, each with its four corners on the
 * output (corner pin) and the part of the picture it shows (input crop). A
 * surface shows the whole program of the output or one of its layers. Without
 * surfaces the output shows its program as it is.
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

export interface MappingSurface {
    id: string;
    name: string;
    /** The whole program, or one layer by its index from the bottom */
    source: 'program' | number;
    corners: Corners;
    crop: Crop;
}

export const FULL_CORNERS: Corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
export const FULL_CROP: Crop = { x: 0, y: 0, width: 1, height: 1 };

const clamp = (value: unknown, low: number, high: number, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(low, Math.min(high, value)) * 100000) / 100000 : fallback;

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
        surfaces.push({
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
