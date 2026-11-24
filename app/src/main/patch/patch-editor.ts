/**
 * Operations on the patch of a show: add, change and remove fixtures,
 * with the checks on universes, addresses and fixture numbers. The
 * functions never change the patch they receive: they return a new one.
 */

import { randomUUID } from 'node:crypto';
import { UNIVERSE_SIZE, type FixtureDefinition } from '../../shared/fixtures/fixture-definition';
import { fixturesInRange } from '../../shared/patch/address-map';
import {
    fitsUniverse,
    MAX_FIXTURE_NUMBER,
    MAX_FIXTURES_PER_ADD,
    MAX_UNIVERSE,
    type PatchedFixture,
    type ShowPatch
} from '../../shared/patch/patch';
import type { MissingFixture, PatchAddRequest, PatchUpdateRequest } from '../../shared/transport/engine-api';
import { EngineError } from '../transport/engine-error';

/** Finds a definition by identifier */
export type DefinitionLookup = (id: string) => FixtureDefinition | undefined;

function requireInteger(value: number, min: number, max: number, code: string, field: string): void {
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new EngineError(code, `Invalid ${field}: ${value}`);
    }
}

function channelCount(definition: FixtureDefinition, modeName: string): number {
    const mode = definition.modes.find((item) => item.name === modeName);
    if (mode === undefined) {
        throw new EngineError('mode-not-found', `Mode not found: ${modeName}`);
    }
    return mode.channels.length;
}

/**
 * Checks that a fixture fits its universe and does not use the addresses of other fixtures.
 */
function checkPlacement(fixtures: readonly PatchedFixture[], placed: readonly PatchedFixture[]): void {
    const ids = new Set(placed.map((fixture) => fixture.id));
    for (const fixture of placed) {
        requireInteger(fixture.universe, 1, MAX_UNIVERSE, 'invalid-universe', 'universe');
        if (!fitsUniverse(fixture.address, fixture.channelCount)) {
            throw new EngineError('address-out-of-range', `Fixture beyond the end of the universe: ${fixture.address}`);
        }
        const others = fixturesInRange(fixtures, fixture, ids);
        if (others.length > 0) {
            throw new EngineError('address-conflict', `Addresses already used by: ${others.map((other) => other.name).join(', ')}`);
        }
    }
}

/**
 * Checks that fixture numbers are valid and not used by other fixtures.
 */
function checkNumbers(fixtures: readonly PatchedFixture[], placed: readonly PatchedFixture[]): void {
    const ids = new Set(placed.map((fixture) => fixture.id));
    const used = new Set(fixtures.filter((fixture) => !ids.has(fixture.id)).map((fixture) => fixture.number));
    for (const fixture of placed) {
        requireInteger(fixture.number, 1, MAX_FIXTURE_NUMBER, 'invalid-fixture-number', 'fixture number');
        if (used.has(fixture.number)) {
            throw new EngineError('fixture-number-in-use', `Fixture number already used: ${fixture.number}`);
        }
        used.add(fixture.number);
    }
}

function cleanName(name: string): string {
    const trimmed = name.trim();
    if (trimmed === '') {
        throw new EngineError('invalid-name', 'Empty name');
    }
    return trimmed.slice(0, 100);
}

/**
 * Adds fixtures on consecutive addresses and with consecutive numbers.
 */
export function addFixtures(patch: ShowPatch, definition: FixtureDefinition, request: PatchAddRequest): { patch: ShowPatch; added: PatchedFixture[] } {
    requireInteger(request.count, 1, MAX_FIXTURES_PER_ADD, 'invalid-params', 'count');
    requireInteger(request.address, 1, UNIVERSE_SIZE, 'address-out-of-range', 'address');
    const channels = channelCount(definition, request.mode);
    const name = cleanName(request.name);

    const added: PatchedFixture[] = [];
    for (let index = 0; index < request.count; index++) {
        added.push({
            id: randomUUID(),
            number: request.number + index,
            name: request.count === 1 ? name : `${name} ${index + 1}`,
            definition: request.definition,
            mode: request.mode,
            channelCount: channels,
            universe: request.universe,
            address: request.address + index * channels
        });
    }
    checkPlacement(patch.fixtures, added);
    checkNumbers(patch.fixtures, added);
    return { patch: { fixtures: [...patch.fixtures, ...added] }, added };
}

/**
 * Changes name, number, universe, address or mode of a fixture.
 * A new mode needs the definition, which must be available.
 */
export function updateFixture(patch: ShowPatch, request: PatchUpdateRequest, lookup: DefinitionLookup): { patch: ShowPatch; fixture: PatchedFixture } {
    const current = patch.fixtures.find((fixture) => fixture.id === request.id);
    if (current === undefined) {
        throw new EngineError('patch-fixture-not-found', `Patched fixture not found: ${request.id}`);
    }
    const next: PatchedFixture = { ...current };
    if (request.name !== undefined) {
        next.name = cleanName(request.name);
    }
    if (request.number !== undefined) {
        next.number = request.number;
    }
    if (request.universe !== undefined) {
        next.universe = request.universe;
    }
    if (request.address !== undefined) {
        requireInteger(request.address, 1, UNIVERSE_SIZE, 'address-out-of-range', 'address');
        next.address = request.address;
    }
    if (request.mode !== undefined && request.mode !== current.mode) {
        const definition = lookup(current.definition);
        if (definition === undefined) {
            throw new EngineError('fixture-not-found', `Fixture definition not found: ${current.definition}`);
        }
        next.mode = request.mode;
        next.channelCount = channelCount(definition, request.mode);
    }
    checkPlacement(patch.fixtures, [next]);
    checkNumbers(patch.fixtures, [next]);
    return { patch: { fixtures: patch.fixtures.map((fixture) => fixture.id === next.id ? next : fixture) }, fixture: next };
}

/**
 * Removes fixtures; unknown identifiers are ignored.
 * @returns The same patch object if nothing was removed
 */
export function removeFixtures(patch: ShowPatch, ids: readonly string[]): ShowPatch {
    const remove = new Set(ids);
    const fixtures = patch.fixtures.filter((fixture) => !remove.has(fixture.id));
    return fixtures.length === patch.fixtures.length ? patch : { fixtures };
}

/**
 * Follows a definition that was saved again: fixtures get the new
 * identifier and the channel count of their mode. Fixtures whose mode no
 * longer exists keep their data and are reported as missing. Addresses
 * are not moved: a longer mode can create a conflict, which the patch shows.
 * @returns The same patch object if nothing changed
 */
export function followDefinition(patch: ShowPatch, previousId: string, id: string, definition: FixtureDefinition): ShowPatch {
    let changed = false;
    const fixtures = patch.fixtures.map((fixture) => {
        if (fixture.definition !== previousId) {
            return fixture;
        }
        const mode = definition.modes.find((item) => item.name === fixture.mode);
        const channels = mode === undefined ? fixture.channelCount : Math.min(mode.channels.length, UNIVERSE_SIZE - fixture.address + 1);
        if (fixture.definition === id && fixture.channelCount === channels) {
            return fixture;
        }
        changed = true;
        return { ...fixture, definition: id, channelCount: channels };
    });
    return changed ? { fixtures } : patch;
}

/**
 * Definitions and modes used by the patch and not found in the library.
 */
export function missingFixtures(patch: ShowPatch, lookup: DefinitionLookup): MissingFixture[] {
    const missing = new Map<string, MissingFixture>();
    for (const fixture of patch.fixtures) {
        const definition = lookup(fixture.definition);
        if (definition !== undefined && definition.modes.some((mode) => mode.name === fixture.mode)) {
            continue;
        }
        const entry = missing.get(fixture.definition) ?? { definition: fixture.definition, modes: [], count: 0 };
        entry.count++;
        if (!entry.modes.includes(fixture.mode)) {
            entry.modes.push(fixture.mode);
        }
        missing.set(fixture.definition, entry);
    }
    return [...missing.values()];
}
