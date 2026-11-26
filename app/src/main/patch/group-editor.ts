/**
 * Operations on the fixture groups of the patch: save (add or change) and
 * delete, with the checks on number, name and members. The functions never
 * change the patch they receive: they return a new one.
 */

import { randomUUID } from 'node:crypto';
import { MAX_GROUP_FIXTURES, MAX_GROUP_NUMBER, type FixtureGroup } from '../../shared/patch/groups';
import type { ShowPatch } from '../../shared/patch/patch';
import { EngineError } from '../transport/engine-error';
import { cleanName, requireInteger } from './patch-checks';

/** Data of a group to save; without id a new group is added */
export interface GroupData {
    id?: string;
    number: number;
    name: string;
    fixtures: string[];
}

/**
 * Adds or changes a group.
 */
export function saveGroup(patch: ShowPatch, data: GroupData): { patch: ShowPatch; group: FixtureGroup } {
    requireInteger(data.number, 1, MAX_GROUP_NUMBER, 'invalid-group-number', 'group number');
    if (data.id !== undefined && !patch.groups.some((group) => group.id === data.id)) {
        throw new EngineError('group-not-found', `Group not found: ${data.id}`);
    }
    if (patch.groups.some((group) => group.number === data.number && group.id !== data.id)) {
        throw new EngineError('group-number-in-use', `Group number already used: ${data.number}`);
    }
    const patched = new Set(patch.fixtures.map((fixture) => fixture.id));
    const fixtures = [...new Set(data.fixtures)];
    if (fixtures.length > MAX_GROUP_FIXTURES || fixtures.some((id) => !patched.has(id))) {
        throw new EngineError('invalid-group', 'Group members must be patched fixtures');
    }
    const group: FixtureGroup = { id: data.id ?? randomUUID(), number: data.number, name: cleanName(data.name), fixtures };
    const groups = data.id === undefined
        ? [...patch.groups, group]
        : patch.groups.map((item) => item.id === group.id ? group : item);
    return { patch: { ...patch, groups: groups.sort((a, b) => a.number - b.number) }, group };
}

/**
 * Deletes a group; an unknown identifier is ignored.
 */
export function deleteGroup(patch: ShowPatch, id: string): ShowPatch {
    return patch.groups.some((group) => group.id === id) ? { ...patch, groups: patch.groups.filter((group) => group.id !== id) } : patch;
}
