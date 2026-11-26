/**
 * Patch of a show: the fixtures placed on DMX universes and addresses.
 * Saved in show.json under "patch". A patched fixture references its
 * definition by identifier only; it also keeps the channel count of its
 * mode, so its addresses stay reserved when the definition is missing.
 */

import { UNIVERSE_SIZE } from '../fixtures/fixture-definition.js';
import { isValidMatrixShape, PIXEL_DIRECTIONS, PIXEL_TYPES, START_CORNERS, type PatchedMatrix } from './matrix.js';

/** Highest universe number */
export const MAX_UNIVERSE = 32768;

/** Highest fixture number */
export const MAX_FIXTURE_NUMBER = 99999;

/** Most fixtures added in one operation */
export const MAX_FIXTURES_PER_ADD = 512;

/** Fixture placed in the patch */
export interface PatchedFixture {
    /** Unique identifier */
    id: string;
    /** Fixture number used by the operator to select it, unique in the show */
    number: number;
    /** Name shown to the user */
    name: string;
    /** Identifier of the definition, for example "clay-paky/sharpy" */
    definition: string;
    /** Name of the mode of the definition */
    mode: string;
    /** Number of channels of the mode */
    channelCount: number;
    /** Universe, from 1 */
    universe: number;
    /** Start address, from 1 to 512 */
    address: number;
}

/** Patch section of show.json */
export interface ShowPatch {
    fixtures: PatchedFixture[];
    /** LED matrices driven directly on DMX channels; missing in older files */
    matrices: PatchedMatrix[];
}

/** Empty patch of a new show */
export const EMPTY_PATCH: ShowPatch = { fixtures: [], matrices: [] };

function isInteger(value: unknown, min: number, max: number): value is number {
    return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/**
 * Tells whether a fixture fits in its universe.
 */
export function fitsUniverse(address: number, channelCount: number): boolean {
    return address >= 1 && channelCount >= 1 && address + channelCount - 1 <= UNIVERSE_SIZE;
}

/**
 * Reads the patch of a file: invalid entries are dropped with a
 * console warning, so a damaged entry never prevents opening the show.
 */
export function normalizePatch(value: unknown): ShowPatch {
    const input = typeof value === 'object' && value !== null ? value as { fixtures?: unknown; matrices?: unknown } : {};
    const fixtures: PatchedFixture[] = [];
    const ids = new Set<string>();
    for (const item of Array.isArray(input.fixtures) ? input.fixtures : []) {
        const entry = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof PatchedFixture, unknown>>;
        const valid = typeof entry.id === 'string' && entry.id !== '' && !ids.has(entry.id)
            && isInteger(entry.number, 1, MAX_FIXTURE_NUMBER)
            && typeof entry.name === 'string'
            && typeof entry.definition === 'string'
            && typeof entry.mode === 'string'
            && isInteger(entry.channelCount, 1, UNIVERSE_SIZE)
            && isInteger(entry.universe, 1, MAX_UNIVERSE)
            && isInteger(entry.address, 1, UNIVERSE_SIZE)
            && fitsUniverse(entry.address as number, entry.channelCount as number);
        if (!valid) {
            console.warn('Patch entry ignored, invalid data', item);
            continue;
        }
        ids.add(entry.id as string);
        fixtures.push({
            id: entry.id as string,
            number: entry.number as number,
            name: entry.name as string,
            definition: entry.definition as string,
            mode: entry.mode as string,
            channelCount: entry.channelCount as number,
            universe: entry.universe as number,
            address: entry.address as number
        });
    }
    return { fixtures, matrices: normalizeMatrices(input.matrices, ids, new Set(fixtures.map((fixture) => fixture.number))) };
}

/**
 * Reads the matrices of a file; invalid entries, and identifiers or
 * numbers already used, are dropped with a console warning.
 */
function normalizeMatrices(value: unknown, ids: Set<string>, numbers: Set<number>): PatchedMatrix[] {
    const matrices: PatchedMatrix[] = [];
    for (const item of Array.isArray(value) ? value : []) {
        const entry = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof PatchedMatrix, unknown>>;
        const matrix = {
            id: entry.id,
            number: entry.number,
            name: entry.name,
            width: entry.width,
            height: entry.height,
            pixelType: entry.pixelType,
            startCorner: entry.startCorner ?? 'topLeft',
            direction: entry.direction ?? 'rows',
            snake: entry.snake ?? false,
            universe: entry.universe,
            address: entry.address
        } as PatchedMatrix;
        const valid = typeof matrix.id === 'string' && matrix.id !== '' && !ids.has(matrix.id)
            && isInteger(matrix.number, 1, MAX_FIXTURE_NUMBER) && !numbers.has(matrix.number)
            && typeof matrix.name === 'string'
            && PIXEL_TYPES.includes(matrix.pixelType) && START_CORNERS.includes(matrix.startCorner)
            && PIXEL_DIRECTIONS.includes(matrix.direction) && typeof matrix.snake === 'boolean'
            && isInteger(matrix.universe, 1, MAX_UNIVERSE) && isValidMatrixShape(matrix);
        if (!valid) {
            console.warn('Patch matrix ignored, invalid data', item);
            continue;
        }
        ids.add(matrix.id);
        numbers.add(matrix.number);
        matrices.push(matrix);
    }
    return matrices;
}
