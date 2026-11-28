/**
 * Edge blending of a video output that overlaps another projector: on each
 * side a zone fading to black, with the shape of its curve and the gamma of
 * the projector, and the black level compensation that lightens the black
 * outside the zones to match the doubled black inside them.
 */

export const BLEND_EDGES = ['left', 'right', 'top', 'bottom'] as const;
export type BlendEdgeName = typeof BLEND_EDGES[number];

export interface BlendEdge {
    /** Width of the zone, in parts of the output; 0 without blending */
    width: number;
    /** Shape of the fade: 1 straight, higher steeper in the middle */
    curve: number;
    /** Gamma of the projector, so the two lights add up evenly */
    gamma: number;
}

export interface OutputBlend {
    edges: Record<BlendEdgeName, BlendEdge>;
    /** Light added outside the zones, 0 to 1 */
    black: number;
}

export const BLEND_LIMITS = {
    width: { min: 0, max: 0.5 },
    curve: { min: 1, max: 4 },
    gamma: { min: 1, max: 3 },
    black: { min: 0, max: 0.2 }
} as const;

export const NEW_EDGE: BlendEdge = { width: 0, curve: 2, gamma: 2.2 };

export function noBlend(): OutputBlend {
    return { edges: { left: { ...NEW_EDGE }, right: { ...NEW_EDGE }, top: { ...NEW_EDGE }, bottom: { ...NEW_EDGE } }, black: 0 };
}

export function blends(blend: OutputBlend): boolean {
    return blend.black > 0 || BLEND_EDGES.some((edge) => blend.edges[edge].width > 0);
}

const clamp = (value: unknown, limits: { min: number; max: number }, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(limits.min, Math.min(limits.max, value)) * 10000) / 10000 : fallback;

export function normalizeBlend(value: unknown): OutputBlend {
    const input = (typeof value === 'object' && value !== null ? value : {}) as { edges?: unknown; black?: unknown };
    const edges = (typeof input.edges === 'object' && input.edges !== null ? input.edges : {}) as Partial<Record<BlendEdgeName, Partial<Record<keyof BlendEdge, unknown>>>>;
    const result = noBlend();
    for (const name of BLEND_EDGES) {
        result.edges[name] = {
            width: clamp(edges[name]?.width, BLEND_LIMITS.width, 0),
            curve: clamp(edges[name]?.curve, BLEND_LIMITS.curve, NEW_EDGE.curve),
            gamma: clamp(edges[name]?.gamma, BLEND_LIMITS.gamma, NEW_EDGE.gamma)
        };
    }
    result.black = clamp(input.black, BLEND_LIMITS.black, 0);
    return result;
}

/**
 * Signal of a zone at a position from its outer side (0) to its inner side
 * (1): the light of two facing zones adds up to the whole.
 */
export function edgeSignal(edge: BlendEdge, position: number): number {
    const x = Math.max(0, Math.min(1, position));
    const light = x < 0.5 ? 0.5 * (2 * x) ** edge.curve : 1 - 0.5 * (2 * (1 - x)) ** edge.curve;
    return light ** (1 / edge.gamma);
}

/** Share of the signal left at a point of the output, 1 outside the zones */
export function blendGain(blend: OutputBlend, x: number, y: number): number {
    const distance: Record<BlendEdgeName, number> = { left: x, right: 1 - x, top: y, bottom: 1 - y };
    return BLEND_EDGES.reduce((gain, name) => {
        const edge = blend.edges[name];
        return edge.width > 0 && distance[name] < edge.width ? gain * edgeSignal(edge, distance[name] / edge.width) : gain;
    }, 1);
}
