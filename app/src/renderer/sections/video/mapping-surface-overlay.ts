/**
 * What the mapping editor draws for the surfaces: their outlines, bent as
 * they are, and for the chosen one the corners or the points of its grid.
 */

import { homography, meshPoint, project, type MappingPoint, type MappingSurface } from '../../../shared/video/mapping.js';
import { t } from '../../i18n/i18n.js';
import type { StageOverlay } from './mapping-stage.js';

/** Pieces of each edge and grid line drawn */
const STEPS = 32;

/** What the handles of a surface move */
export type MappingHandles = 'corners' | 'mesh';

export function surfaceOverlay(surfaces: readonly MappingSurface[], selected: string | null, mode: MappingHandles): StageOverlay {
    const overlay: StageOverlay = { shapes: [], grid: [], guides: [], handles: [] };
    const steps = Array.from({ length: STEPS + 1 }, (_, index) => index / STEPS);
    for (const surface of surfaces) {
        const matrix = homography(surface.corners);
        if (matrix === null) {
            continue;
        }
        const path = (points: MappingPoint[]): string => `M ${points.map(([u, v]) => project(matrix, meshPoint(surface.mesh, u, v)).join(' ')).join(' L ')}`;
        const chosen = surface.id === selected;
        overlay.shapes.push({
            id: surface.id,
            selected: chosen,
            path: `${path([
                ...steps.map((s): MappingPoint => [s, 0]), ...steps.map((s): MappingPoint => [1, s]),
                ...steps.map((s): MappingPoint => [1 - s, 1]), ...steps.map((s): MappingPoint => [0, 1 - s])
            ])} Z`
        });
        if (!chosen) {
            continue;
        }
        if (mode === 'corners') {
            overlay.handles = surface.corners.map((point, index) => ({ point, style: 'corner' as const, text: String(index + 1), label: t('mapping.corner', { number: index + 1 }) }));
        } else if (surface.mesh !== undefined) {
            const { columns, rows, points } = surface.mesh;
            overlay.grid = [
                ...Array.from({ length: columns - 2 }, (_, index) => path(steps.map((s): MappingPoint => [(index + 1) / (columns - 1), s]))),
                ...Array.from({ length: rows - 2 }, (_, index) => path(steps.map((s): MappingPoint => [s, (index + 1) / (rows - 1)])))
            ];
            overlay.handles = points.map((point, index) => ({ point: project(matrix, point), style: 'point' as const, label: t('mapping.point', { number: index + 1 }) }));
        }
    }
    return overlay;
}
