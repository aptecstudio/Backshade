/**
 * Snap of the points dragged in the mapping editor (decided by the human:
 * both kinds): to the edges and middle of the output and to the other points,
 * and to a grid with a step in pixels. The choice is kept on this device.
 */

import { LocalPreference } from '../../../framework/ts/index.js';
import type { MappingPoint } from '../../../shared/video/mapping.js';

export const GRID_STEPS = [10, 20, 40, 80, 160] as const;

export interface SnapSettings {
    /** Edges and middle of the output, and the other points */
    points: boolean;
    grid: boolean;
    /** Step of the grid, in pixels of the output */
    step: number;
}

const preference = new LocalPreference('backshade.mappingSnap');

export function loadSnap(): SnapSettings {
    let saved: Partial<SnapSettings> = {};
    try {
        saved = JSON.parse(preference.get() ?? '{}') as Partial<SnapSettings>;
    } catch {
        // A broken value takes the defaults
    }
    return {
        points: saved.points !== false,
        grid: saved.grid === true,
        step: GRID_STEPS.find((step) => step === saved.step) ?? 40
    };
}

export function saveSnap(settings: SnapSettings): void {
    preference.set(JSON.stringify(settings));
}

/** Where a coordinate goes, and the line to show when it caught an edge or a point */
function snapAxis(value: number, targets: readonly number[], reach: number, step: number): { value: number; line: number | null } {
    let nearest: number | null = null;
    for (const target of targets) {
        if (Math.abs(target - value) <= reach && (nearest === null || Math.abs(target - value) < Math.abs(nearest - value))) {
            nearest = target;
        }
    }
    if (nearest !== null) {
        return { value: nearest, line: nearest };
    }
    // The grid always holds the point
    return { value: step > 0 ? Math.round(value / step) * step : value, line: null };
}

/**
 * Snaps a point, each axis on its own.
 * @param targets - Points to catch
 * @param reach - Distance within which they are caught, in parts of the output
 * @param step - Step of the grid in parts of the output, 0 without grid
 */
export function snapPoint(
    point: MappingPoint,
    targets: readonly MappingPoint[],
    settings: SnapSettings,
    reach: MappingPoint,
    step: MappingPoint
): { point: MappingPoint; lines: [number | null, number | null] } {
    const axis = (at: 0 | 1): { value: number; line: number | null } =>
        snapAxis(point[at], settings.points ? [0, 0.5, 1, ...targets.map((target) => target[at])] : [], reach[at], settings.grid ? step[at] : 0);
    const x = axis(0);
    const y = axis(1);
    return { point: [x.value, y.value], lines: [x.line, y.line] };
}
