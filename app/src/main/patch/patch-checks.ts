/**
 * Checks shared by the operations on the patch: universes and addresses
 * free from other fixtures and matrices, numbers not in use, names.
 */

import { fitsUniverse, MAX_FIXTURE_NUMBER, MAX_UNIVERSE, type ShowPatch } from '../../shared/patch/patch';
import { fixturesInRange, occupiedRanges, type PlacedRange } from '../../shared/patch/address-map';
import { EngineError } from '../transport/engine-error';

/**
 * Checks an integer within limits.
 * @throws EngineError with the given code
 */
export function requireInteger(value: number, min: number, max: number, code: string, field: string): void {
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new EngineError(code, `Invalid ${field}: ${value}`);
    }
}

/**
 * Checks that the placed ranges fit their universes and do not use the
 * addresses of other fixtures or matrices (the placed ones are left out by identifier).
 */
export function checkPlacement(patch: ShowPatch, placed: readonly PlacedRange[]): void {
    const ids = new Set(placed.map((range) => range.id));
    const others = occupiedRanges(patch);
    for (const range of placed) {
        requireInteger(range.universe, 1, MAX_UNIVERSE, 'invalid-universe', 'universe');
        if (!fitsUniverse(range.address, range.channelCount)) {
            throw new EngineError('address-out-of-range', `Beyond the end of the universe: ${range.address}`);
        }
        const used = fixturesInRange(others, range, ids);
        if (used.length > 0) {
            throw new EngineError('address-conflict', `Addresses already used by: ${[...new Set(used.map((other) => other.name))].join(', ')}`);
        }
    }
}

/**
 * Checks that numbers are valid and not used by other fixtures or matrices.
 */
export function checkNumbers(patch: ShowPatch, placed: ReadonlyArray<{ id: string; number: number }>): void {
    const ids = new Set(placed.map((item) => item.id));
    const used = new Set([...patch.fixtures, ...patch.matrices].filter((item) => !ids.has(item.id)).map((item) => item.number));
    for (const item of placed) {
        requireInteger(item.number, 1, MAX_FIXTURE_NUMBER, 'invalid-fixture-number', 'fixture number');
        if (used.has(item.number)) {
            throw new EngineError('fixture-number-in-use', `Fixture number already used: ${item.number}`);
        }
        used.add(item.number);
    }
}

/**
 * Trimmed name, at most 100 characters.
 * @throws EngineError "invalid-name" for an empty name
 */
export function cleanName(name: string): string {
    const trimmed = name.trim();
    if (trimmed === '') {
        throw new EngineError('invalid-name', 'Empty name');
    }
    return trimmed.slice(0, 100);
}
