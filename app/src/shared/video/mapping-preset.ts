/**
 * Mapping of an output (surfaces, masks and edge blending), its presets and
 * the morph from one mapping to another. A preset belongs to one output
 * (decided by the human) and is recalled by scenes and timelines.
 */

import { BLEND_EDGES, normalizeBlend, type OutputBlend } from './blend.js';
import { normalizeSurfaces, resampleMesh, type MappingPoint, type MappingSurface } from './mapping.js';
import { normalizeMasks, type OutputMask } from './mask.js';

export interface OutputMapping {
    surfaces: MappingSurface[];
    masks: OutputMask[];
    blend: OutputBlend;
}

export interface MappingPreset extends OutputMapping {
    id: string;
    name: string;
    /** Seconds taken to move to this mapping when it is recalled */
    morph: number;
}

export const MAX_PRESETS = 32;
export const MORPH_LIMITS = { min: 0, max: 60 } as const;

/** Only the mapping of something that has more, copied */
export function mappingOf({ surfaces, masks, blend }: OutputMapping): OutputMapping {
    return structuredClone({ surfaces, masks, blend });
}

export function normalizeMapping(value: unknown): OutputMapping {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof OutputMapping, unknown>>;
    return { surfaces: normalizeSurfaces(input.surfaces), masks: normalizeMasks(input.masks), blend: normalizeBlend(input.blend) };
}

/** Reads a preset; null without identifier */
export function normalizePreset(value: unknown): MappingPreset | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof MappingPreset, unknown>>;
    if (typeof input.id !== 'string' || input.id === '') {
        return null;
    }
    const morph = typeof input.morph === 'number' && Number.isFinite(input.morph) ? input.morph : 0;
    return {
        id: input.id,
        name: typeof input.name === 'string' ? input.name.slice(0, 60) : 'Preset',
        morph: Math.max(MORPH_LIMITS.min, Math.min(MORPH_LIMITS.max, morph)),
        ...normalizeMapping(input)
    };
}

export function normalizePresets(value: unknown): MappingPreset[] {
    const ids = new Set<string>();
    const result: MappingPreset[] = [];
    for (const raw of Array.isArray(value) ? value.slice(0, MAX_PRESETS) : []) {
        const preset = normalizePreset(raw);
        if (preset !== null && !ids.has(preset.id)) {
            ids.add(preset.id);
            result.push(preset);
        }
    }
    return result;
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const mixPoint = (a: MappingPoint, b: MappingPoint, t: number): MappingPoint => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

function mixSurface(from: MappingSurface, to: MappingSurface, t: number): MappingSurface {
    const result: MappingSurface = {
        ...to,
        corners: to.corners.map((corner, index) => mixPoint(from.corners[index], corner, t)) as MappingSurface['corners'],
        crop: { x: mix(from.crop.x, to.crop.x, t), y: mix(from.crop.y, to.crop.y, t), width: mix(from.crop.width, to.crop.width, t), height: mix(from.crop.height, to.crop.height, t) }
    };
    const grid = to.mesh ?? from.mesh;
    if (grid !== undefined) {
        // Both shapes on the same number of points: a flat surface is a regular grid
        const a = resampleMesh(from.mesh, grid.columns, grid.rows);
        const b = resampleMesh(to.mesh, grid.columns, grid.rows);
        result.mesh = { ...b, points: b.points.map((point, index) => mixPoint(a.points[index], point, t)) };
    }
    return result;
}

function mixMask(from: OutputMask, to: OutputMask, t: number): OutputMask {
    // Shapes with different points cannot move into each other: the new one is taken
    if (from.points.length !== to.points.length) {
        return to;
    }
    return {
        ...to,
        feather: mix(from.feather, to.feather, t),
        points: to.points.map((point, index) => {
            const old = from.points[index];
            return { at: mixPoint(old.at, point.at, t), in: mixPoint(old.in, point.in, t), out: mixPoint(old.out, point.out, t), smooth: point.smooth };
        })
    };
}

/**
 * Mapping on the way from one to another, t from 0 to 1. Surfaces and masks
 * with the same identifier move; the others are those of the new mapping.
 */
export function mixMapping(from: OutputMapping, to: OutputMapping, t: number): OutputMapping {
    if (t >= 1) {
        return to;
    }
    const blend = structuredClone(to.blend);
    for (const name of BLEND_EDGES) {
        const a = from.blend.edges[name];
        const b = to.blend.edges[name];
        blend.edges[name] = { width: mix(a.width, b.width, t), curve: mix(a.curve, b.curve, t), gamma: mix(a.gamma, b.gamma, t) };
    }
    blend.black = mix(from.blend.black, to.blend.black, t);
    return {
        surfaces: to.surfaces.map((surface) => {
            const old = from.surfaces.find((item) => item.id === surface.id);
            return old === undefined ? surface : mixSurface(old, surface, t);
        }),
        masks: to.masks.map((mask) => {
            const old = from.masks.find((item) => item.id === mask.id);
            return old === undefined ? mask : mixMask(old, mask, t);
        }),
        blend
    };
}
