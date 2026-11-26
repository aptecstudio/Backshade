/**
 * Address checks of the patch: overlapping fixtures and matrices, and
 * search of free addresses in a universe. Shared, so the engine refuses
 * conflicts and the interface can suggest a free address before asking.
 * A matrix takes one range per universe it uses, with its own identifier.
 */

import { UNIVERSE_SIZE } from '../fixtures/fixture-definition.js';
import { matrixSegments } from './matrix.js';
import type { PatchedFixture, ShowPatch } from './patch.js';

/** Part of a fixture needed to know which addresses it uses */
export type AddressRange = Pick<PatchedFixture, 'universe' | 'address' | 'channelCount'>;

/** Addresses used by a fixture or by the part of a matrix on one universe */
export interface PlacedRange extends AddressRange {
    /** Identifier of the fixture or of the matrix */
    id: string;
    number: number;
    name: string;
}

/**
 * Every range of addresses used by the patch: fixtures and matrix parts.
 */
export function occupiedRanges(patch: ShowPatch): PlacedRange[] {
    return [
        ...patch.fixtures,
        ...patch.matrices.flatMap((matrix) => matrixSegments(matrix).map((segment) => ({
            id: matrix.id,
            number: matrix.number,
            name: matrix.name,
            universe: segment.universe,
            address: segment.address,
            channelCount: segment.channelCount
        })))
    ];
}

/**
 * Last address used by a fixture.
 */
export function lastAddress(range: AddressRange): number {
    return range.address + range.channelCount - 1;
}

/**
 * Tells whether two fixtures use at least one common address.
 */
export function overlaps(a: AddressRange, b: AddressRange): boolean {
    return a.universe === b.universe && a.address <= lastAddress(b) && b.address <= lastAddress(a);
}

/**
 * Identifiers of the fixtures that share at least one address with another one.
 */
export function findConflicts(fixtures: readonly (AddressRange & { id: string })[]): Set<string> {
    const conflicts = new Set<string>();
    const byUniverse = new Map<number, Array<AddressRange & { id: string }>>();
    for (const fixture of fixtures) {
        const list = byUniverse.get(fixture.universe) ?? [];
        list.push(fixture);
        byUniverse.set(fixture.universe, list);
    }
    for (const list of byUniverse.values()) {
        const sorted = [...list].sort((a, b) => a.address - b.address);
        let reach: (AddressRange & { id: string }) | null = null;
        for (const fixture of sorted) {
            if (reach !== null && fixture.address <= lastAddress(reach)) {
                conflicts.add(fixture.id);
                conflicts.add(reach.id);
            }
            if (reach === null || lastAddress(fixture) > lastAddress(reach)) {
                reach = fixture;
            }
        }
    }
    return conflicts;
}

/**
 * Fixtures that use at least one address of the given range.
 * @param ignore - Identifiers not to consider, for example the fixtures being moved
 */
export function fixturesInRange<T extends AddressRange & { id: string }>(fixtures: readonly T[], range: AddressRange, ignore: ReadonlySet<string> = new Set()): T[] {
    return fixtures.filter((fixture) => !ignore.has(fixture.id) && overlaps(fixture, range));
}

/**
 * First address of a universe, from a start address, with room for
 * count consecutive fixtures of channelCount channels; null if there is none.
 */
export function findFreeAddress(
    fixtures: readonly (AddressRange & { id: string })[],
    universe: number,
    channelCount: number,
    count = 1,
    from = 1,
    ignore: ReadonlySet<string> = new Set()
): number | null {
    const size = channelCount * count;
    if (size > UNIVERSE_SIZE) {
        return null;
    }
    const used = fixtures
        .filter((fixture) => fixture.universe === universe && !ignore.has(fixture.id))
        .sort((a, b) => a.address - b.address);
    let candidate = Math.max(1, from);
    for (const fixture of used) {
        if (lastAddress(fixture) < candidate) {
            continue;
        }
        if (fixture.address >= candidate + size) {
            break;
        }
        candidate = lastAddress(fixture) + 1;
    }
    return candidate + size - 1 <= UNIVERSE_SIZE ? candidate : null;
}

/**
 * Lowest fixture number not in use, from a start number, with room for
 * count consecutive numbers.
 */
export function findFreeNumber(fixtures: readonly Pick<PatchedFixture, 'number'>[], count = 1, from = 1): number {
    const used = new Set(fixtures.map((fixture) => fixture.number));
    let candidate = Math.max(1, from);
    for (;;) {
        let free = true;
        for (let offset = 0; offset < count; offset++) {
            if (used.has(candidate + offset)) {
                candidate += offset + 1;
                free = false;
                break;
            }
        }
        if (free) {
            return candidate;
        }
    }
}
