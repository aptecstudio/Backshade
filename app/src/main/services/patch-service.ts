/**
 * patch.* methods: fixtures of the open show on the DMX universes.
 * Every change is an unsaved change of the show and is notified with
 * the patch.changed event.
 */

import { findConflicts } from '../../shared/patch/address-map';
import type { PatchedFixture, ShowPatch } from '../../shared/patch/patch';
import type { PatchEntry } from '../../shared/transport/engine-api';
import type { FixtureLibrary } from '../fixtures/fixture-library';
import { addFixtures, missingFixtures, removeFixtures, updateFixture, type DefinitionLookup } from '../patch/patch-editor';
import type { ShowSession } from '../shows/show-session';
import type { EventBus } from '../transport/event-bus';
import { optionalInteger, optionalString, requireInteger, requireObject, requireString, requireStringArray } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Adds the definition data and the state of each fixture.
 */
function toEntries(patch: ShowPatch, lookup: DefinitionLookup, only?: readonly PatchedFixture[]): PatchEntry[] {
    const conflicts = findConflicts(patch.fixtures);
    return (only ?? patch.fixtures).map((fixture) => {
        const definition = lookup(fixture.definition);
        const mode = definition?.modes.find((item) => item.name === fixture.mode);
        return {
            ...fixture,
            manufacturer: definition?.manufacturer ?? null,
            model: definition?.model ?? null,
            category: definition?.category ?? null,
            missing: mode === undefined,
            // A mode that no longer fits its address is shown as a conflict too
            conflict: conflicts.has(fixture.id) || (mode !== undefined && mode.channels.length !== fixture.channelCount)
        };
    });
}

/**
 * Registers the methods of the service.
 */
export function registerPatchService(router: RequestRouter, bus: EventBus, session: ShowSession, library: FixtureLibrary): void {
    const lookup: DefinitionLookup = (id) => library.find(id)?.definition;
    session.onContentChange((part) => {
        if (part !== 'output') {
            bus.emit('patch.changed', {});
        }
    });

    router.register('patch.get', () => toEntries(session.patch(), lookup));

    router.register('patch.missingFixtures', () => {
        library.reload();
        return missingFixtures(session.patch(), lookup);
    });

    router.register('patch.add', (params) => {
        const input = requireObject(params);
        const definitionId = requireString(input, 'definition');
        const result = addFixtures(session.patch(), library.require(definitionId).definition, {
            definition: definitionId,
            mode: requireString(input, 'mode'),
            count: requireInteger(input, 'count'),
            universe: requireInteger(input, 'universe'),
            address: requireInteger(input, 'address'),
            number: requireInteger(input, 'number'),
            name: requireString(input, 'name')
        });
        session.setPatch(result.patch);
        return toEntries(result.patch, lookup, result.added);
    });

    router.register('patch.update', (params) => {
        const input = requireObject(params);
        const result = updateFixture(session.patch(), {
            id: requireString(input, 'id'),
            name: optionalString(input, 'name'),
            number: optionalInteger(input, 'number'),
            universe: optionalInteger(input, 'universe'),
            address: optionalInteger(input, 'address'),
            mode: optionalString(input, 'mode')
        }, lookup);
        session.setPatch(result.patch);
        return toEntries(result.patch, lookup, [result.fixture])[0];
    });

    router.register('patch.remove', (params) => {
        session.setPatch(removeFixtures(session.patch(), requireStringArray(requireObject(params), 'ids')));
        return undefined;
    });
}
