/**
 * Rows of the patch views: the patched fixtures and, for every LED
 * matrix, one row per universe it uses. Matrix rows carry their matrix,
 * so the views open the right dialog.
 */

import type { MatrixEntry, PatchEntry } from '../../../shared/transport/engine-api.js';
import { t } from '../../i18n/i18n.js';

/** Row of the patch: a fixture, or the part of a matrix on one universe */
export interface PatchRow extends PatchEntry {
    /** Matrix of the row, undefined for fixtures */
    matrix?: MatrixEntry;
}

/**
 * Rows of the fixtures and of the matrix parts.
 */
export function patchRows(entries: readonly PatchEntry[], matrices: readonly MatrixEntry[]): PatchRow[] {
    const rows: PatchRow[] = [...entries];
    for (const matrix of matrices) {
        matrix.segments.forEach((segment, index) => {
            rows.push({
                id: `${matrix.id}#${index}`,
                number: matrix.number,
                name: matrix.name,
                definition: '',
                mode: matrix.segments.length > 1
                    ? t('matrix.part', { type: matrix.pixelType.toUpperCase(), part: index + 1, count: matrix.segments.length })
                    : matrix.pixelType.toUpperCase(),
                channelCount: segment.channelCount,
                universe: segment.universe,
                address: segment.address,
                manufacturer: t('matrix.kind'),
                model: `${matrix.width} x ${matrix.height}`,
                category: null,
                missing: false,
                conflict: matrix.conflict,
                matrix
            });
        });
    }
    return rows;
}
