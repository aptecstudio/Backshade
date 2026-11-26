/**
 * Operations on the LED matrices of the patch: add and change, with the
 * checks on size, pixel type, universes and addresses (free from fixtures
 * and other matrices) and number. The functions never change the patch
 * they receive: they return a new one.
 */

import { randomUUID } from 'node:crypto';
import type { PlacedRange } from '../../shared/patch/address-map';
import {
    isValidMatrixShape,
    matrixSegments,
    PIXEL_DIRECTIONS,
    PIXEL_TYPES,
    START_CORNERS,
    type PatchedMatrix
} from '../../shared/patch/matrix';
import type { ShowPatch } from '../../shared/patch/patch';
import { EngineError } from '../transport/engine-error';
import { checkNumbers, checkPlacement, cleanName } from './patch-checks';

/** Data of a matrix, without its identifier */
export type MatrixData = Omit<PatchedMatrix, 'id'>;

/**
 * Checks a matrix and returns it with a clean name.
 */
function checkMatrix(patch: ShowPatch, matrix: PatchedMatrix): PatchedMatrix {
    const clean = { ...matrix, name: cleanName(matrix.name) };
    if (!PIXEL_TYPES.includes(clean.pixelType) || !START_CORNERS.includes(clean.startCorner)
        || !PIXEL_DIRECTIONS.includes(clean.direction) || typeof clean.snake !== 'boolean') {
        throw new EngineError('invalid-params', 'Invalid matrix wiring');
    }
    if (!isValidMatrixShape(clean)) {
        throw new EngineError('invalid-matrix', `Invalid matrix size or address: ${clean.width} x ${clean.height} at ${clean.address}`);
    }
    const ranges: PlacedRange[] = matrixSegments(clean).map((segment) => ({
        id: clean.id,
        number: clean.number,
        name: clean.name,
        universe: segment.universe,
        address: segment.address,
        channelCount: segment.channelCount
    }));
    checkPlacement(patch, ranges);
    checkNumbers(patch, [clean]);
    return clean;
}

/**
 * Adds a matrix.
 */
export function addMatrix(patch: ShowPatch, data: MatrixData): { patch: ShowPatch; matrix: PatchedMatrix } {
    const matrix = checkMatrix(patch, { ...data, id: randomUUID() });
    return { patch: { ...patch, matrices: [...patch.matrices, matrix] }, matrix };
}

/**
 * Changes a matrix.
 */
export function updateMatrix(patch: ShowPatch, id: string, data: MatrixData): { patch: ShowPatch; matrix: PatchedMatrix } {
    if (!patch.matrices.some((item) => item.id === id)) {
        throw new EngineError('patch-fixture-not-found', `Matrix not found: ${id}`);
    }
    const matrix = checkMatrix(patch, { ...data, id });
    return { patch: { ...patch, matrices: patch.matrices.map((item) => item.id === id ? matrix : item) }, matrix };
}
