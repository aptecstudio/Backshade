/**
 * Patch of a show: the fixtures placed on DMX universes and addresses.
 * Saved in show.json under "patch". A patched fixture references its
 * definition by identifier only; it also keeps the channel count of its
 * mode, so its addresses stay reserved when the definition is missing.
 */

import { UNIVERSE_SIZE } from '../fixtures/fixture-definition.js';

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
}

/** Empty patch of a new show */
export const EMPTY_PATCH: ShowPatch = { fixtures: [] };

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
    const input = typeof value === 'object' && value !== null ? value as { fixtures?: unknown } : {};
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
    return { fixtures };
}
