/**
 * How the light of a fixture follows its dimmer channel: ready curves, or
 * one drawn through points. Used by the live view of the 3D stage; the DMX
 * output is not changed.
 */

export const DIMMER_CURVE_KINDS = ['linear', 'square', 'inverseSquare', 's', 'custom'] as const;
export type DimmerCurveKind = typeof DIMMER_CURVE_KINDS[number];

/** Point of a drawn curve: dimmer and light, both from 0 to 1 */
export type CurvePoint = [number, number];

export interface DimmerCurve {
    kind: DimmerCurveKind;
    /** Points of a drawn curve, in order of dimmer value */
    points?: CurvePoint[];
}

/** Most points of a drawn curve */
export const MAX_CURVE_POINTS = 32;

/** Reads a curve; undefined when there is none, null when it is invalid */
export function readDimmerCurve(value: unknown): DimmerCurve | undefined | null {
    if (value === undefined) {
        return undefined;
    }
    const input = typeof value === 'object' && value !== null ? value as { kind?: unknown; points?: unknown } : {};
    if (!DIMMER_CURVE_KINDS.includes(input.kind as DimmerCurveKind)) {
        return null;
    }
    const kind = input.kind as DimmerCurveKind;
    if (kind !== 'custom') {
        return { kind };
    }
    const unit = (item: unknown): item is number => typeof item === 'number' && item >= 0 && item <= 1;
    const points = Array.isArray(input.points) ? input.points as unknown[] : [];
    if (points.length < 2 || points.length > MAX_CURVE_POINTS || !points.every((point) => Array.isArray(point) && point.length === 2 && unit(point[0]) && unit(point[1]))) {
        return null;
    }
    return { kind, points: (points as CurvePoint[]).map(([x, y]): CurvePoint => [x, y]).sort((a, b) => a[0] - b[0]) };
}

/** Light given by a dimmer value, both from 0 to 1 */
export function applyDimmerCurve(curve: DimmerCurve | undefined, value: number): number {
    switch (curve?.kind) {
        case 'square':
            return value * value;
        case 'inverseSquare':
            return 1 - (1 - value) * (1 - value);
        case 's':
            return value * value * (3 - 2 * value);
        case 'custom': {
            const points = curve.points ?? [];
            const next = points.findIndex(([x]) => x >= value);
            if (next < 0) {
                return points[points.length - 1]?.[1] ?? value;
            }
            const [x1, y1] = points[next];
            const [x0, y0] = points[next - 1] ?? points[next];
            return x1 === x0 ? y1 : y0 + (y1 - y0) * ((value - x0) / (x1 - x0));
        }
        default:
            return value;
    }
}
