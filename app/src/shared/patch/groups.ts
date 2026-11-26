/**
 * Fixture groups of the patch: named sets of patched fixtures, such as
 * "Wash" or "Front pars", used to select fixtures at once and to drive
 * their intensity from a fader. Saved in show.json under "patch.groups".
 * Shared between engine and interface.
 */

/** Highest group number */
export const MAX_GROUP_NUMBER = 999;

/** Most fixtures in a group */
export const MAX_GROUP_FIXTURES = 1024;

/** Group of fixtures */
export interface FixtureGroup {
    id: string;
    /** Number, unique among the groups */
    number: number;
    name: string;
    /** Identifiers of the patched fixtures, in the order chosen */
    fixtures: string[];
}

/**
 * Reads the groups of a file: invalid groups, repeated numbers and
 * members that are not in the patch are dropped.
 * @param fixtureIds - Identifiers of the patched fixtures
 */
export function normalizeGroups(value: unknown, fixtureIds: ReadonlySet<string>, usedIds: Set<string>): FixtureGroup[] {
    const groups: FixtureGroup[] = [];
    const numbers = new Set<number>();
    for (const item of Array.isArray(value) ? value : []) {
        const entry = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof FixtureGroup, unknown>>;
        const number = entry.number;
        const valid = typeof entry.id === 'string' && entry.id !== '' && !usedIds.has(entry.id)
            && Number.isInteger(number) && (number as number) >= 1 && (number as number) <= MAX_GROUP_NUMBER && !numbers.has(number as number)
            && typeof entry.name === 'string' && Array.isArray(entry.fixtures);
        if (!valid) {
            console.warn('Patch group ignored, invalid data', item);
            continue;
        }
        usedIds.add(entry.id as string);
        numbers.add(number as number);
        const members = [...new Set((entry.fixtures as unknown[]).filter((id): id is string => typeof id === 'string' && fixtureIds.has(id)))];
        groups.push({ id: entry.id as string, number: number as number, name: entry.name as string, fixtures: members.slice(0, MAX_GROUP_FIXTURES) });
    }
    return groups;
}
