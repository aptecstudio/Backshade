/**
 * Masks of a video output: closed shapes drawn on the whole output, with
 * curve handles on their points. A mask hides what is inside it, or, when
 * inverted, what is outside; its edge can be softened. Positions are in
 * parts of the output, handles are offsets from their point.
 */

import { CORNER_MARGIN, type MappingPoint } from './mapping.js';

export const MAX_MASKS = 16;
export const MASK_POINTS = { min: 3, max: 64 } as const;
/** Widest soft edge, in parts of the output width */
export const MAX_FEATHER = 0.2;

export interface MaskPoint {
    at: MappingPoint;
    /** Handle of the curve arriving at the point, and of the curve leaving it */
    in: MappingPoint;
    out: MappingPoint;
    /** The two handles stay in line */
    smooth: boolean;
}

export interface OutputMask {
    id: string;
    name: string;
    points: MaskPoint[];
    feather: number;
    inverted: boolean;
    enabled: boolean;
}

export type MaskShape = 'rectangle' | 'ellipse';

/** Handle length that makes four curves look like an ellipse */
const CIRCLE = 0.5523;

const round = (value: number): number => Math.round(value * 100000) / 100000 || 0;
const pair = (x: number, y: number): MappingPoint => [round(x), round(y)];

/** Points of a new mask in the middle of the output */
export function newMaskPoints(shape: MaskShape): MaskPoint[] {
    if (shape === 'rectangle') {
        return [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]].map(([x, y]) => ({ at: pair(x, y), in: [0, 0], out: [0, 0], smooth: false }));
    }
    const radius = 0.2;
    const h = radius * CIRCLE;
    return [
        { at: pair(0.5, 0.5 - radius), in: pair(-h, 0), out: pair(h, 0), smooth: true },
        { at: pair(0.5 + radius, 0.5), in: pair(0, -h), out: pair(0, h), smooth: true },
        { at: pair(0.5, 0.5 + radius), in: pair(h, 0), out: pair(-h, 0), smooth: true },
        { at: pair(0.5 - radius, 0.5), in: pair(0, h), out: pair(0, -h), smooth: true }
    ];
}

/** Path of a mask, as the data of an SVG path, scaled to a size */
export function maskPath(points: readonly MaskPoint[], width: number, height: number): string {
    const text = (x: number, y: number): string => `${round(x * width)} ${round(y * height)}`;
    const curves = points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        return `C ${text(point.at[0] + point.out[0], point.at[1] + point.out[1])} ${text(next.at[0] + next.in[0], next.at[1] + next.in[1])} ${text(...next.at)}`;
    });
    return `M ${text(...points[0].at)} ${curves.join(' ')} Z`;
}

/** Adds a point in the middle of the curve after one, keeping the shape */
export function splitCurve(points: readonly MaskPoint[], index: number): MaskPoint[] {
    const first = points[index];
    const second = points[(index + 1) % points.length];
    const mid = (a: MappingPoint, b: MappingPoint): MappingPoint => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const plus = (a: MappingPoint, b: MappingPoint): MappingPoint => [a[0] + b[0], a[1] + b[1]];
    const minus = (a: MappingPoint, b: MappingPoint): MappingPoint => [a[0] - b[0], a[1] - b[1]];
    // De Casteljau at the middle
    const p1 = plus(first.at, first.out);
    const p2 = plus(second.at, second.in);
    const a = mid(first.at, p1);
    const b = mid(p1, p2);
    const c = mid(p2, second.at);
    const d = mid(a, b);
    const e = mid(b, c);
    const at = mid(d, e);
    const round2 = (value: MappingPoint): MappingPoint => pair(...value);
    const straight = [...first.out, ...second.in].every((value) => value === 0);
    const added: MaskPoint = straight
        ? { at: round2(mid(first.at, second.at)), in: [0, 0], out: [0, 0], smooth: false }
        : { at: round2(at), in: round2(minus(d, at)), out: round2(minus(e, at)), smooth: true };
    const result = points.map((point) => ({ ...point }));
    if (!straight) {
        result[index].out = round2(minus(a, first.at));
        result[(index + 1) % points.length].in = round2(minus(c, second.at));
    }
    result.splice(index + 1, 0, added);
    return result;
}

function point(value: unknown, low: number, high: number): MappingPoint {
    const input = Array.isArray(value) ? value as unknown[] : [];
    return [0, 1].map((axis) => typeof input[axis] === 'number' && Number.isFinite(input[axis]) ? round(Math.max(low, Math.min(high, input[axis] as number))) : 0) as MappingPoint;
}

/** Reads the masks of a file or of a request: invalid ones are dropped */
export function normalizeMasks(value: unknown): OutputMask[] {
    const masks: OutputMask[] = [];
    const ids = new Set<string>();
    for (const item of Array.isArray(value) ? value.slice(0, MAX_MASKS) : []) {
        const input = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof OutputMask, unknown>>;
        const points = Array.isArray(input.points) ? input.points.slice(0, MASK_POINTS.max) : [];
        if (typeof input.id !== 'string' || input.id === '' || ids.has(input.id) || points.length < MASK_POINTS.min) {
            continue;
        }
        ids.add(input.id);
        masks.push({
            id: input.id,
            name: typeof input.name === 'string' ? input.name.slice(0, 60) : '',
            points: points.map((raw) => {
                const entry = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof MaskPoint, unknown>>;
                return {
                    at: point(entry.at, -CORNER_MARGIN, 1 + CORNER_MARGIN),
                    in: point(entry.in, -1, 1),
                    out: point(entry.out, -1, 1),
                    smooth: entry.smooth === true
                };
            }),
            feather: typeof input.feather === 'number' && Number.isFinite(input.feather) ? Math.max(0, Math.min(MAX_FEATHER, input.feather)) : 0,
            inverted: input.inverted === true,
            enabled: input.enabled !== false
        });
    }
    return masks;
}
