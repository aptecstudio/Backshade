/**
 * fixtures.* methods: the fixture library, with the editing of user
 * definitions, import and export. When a definition used by the open
 * show is saved again, the patch follows it (new identifier, new channel count).
 */

import fs from 'node:fs';
import path from 'node:path';
import { validateFixture } from '../../shared/fixtures/validate-fixture';
import { FIXTURE_FILE_EXTENSION, toSummary, type FixtureLibrary } from '../fixtures/fixture-library';
import { followDefinition } from '../patch/patch-editor';
import type { ShowSession } from '../shows/show-session';
import type { EventBus } from '../transport/event-bus';
import { optionalString, requireObject, requireString, requireStringArray } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import { pickedFile, pickedTarget } from '../files/picked-paths';
import { EngineError } from '../transport/engine-error';

/** Images a gobo mask can be made from */
const IMAGE_TYPES: Readonly<Record<string, string>> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp' };
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Registers the methods of the service.
 */
export function registerFixtureService(router: RequestRouter, bus: EventBus, session: ShowSession, library: FixtureLibrary): void {
    const changed = (): void => bus.emit('fixtures.changed', {});

    // A show carries the definitions it uses; another show has others
    session.onContentChange((part) => {
        if ((part === 'patch' || part === 'all') && session.summary() !== null) {
            library.keepInShow(session.patch().fixtures.map((fixture) => fixture.definition));
        }
        if (part === 'all') {
            changed();
        }
    });

    router.register('fixtures.list', () => library.list().map(toSummary));

    router.register('fixtures.get', (params) => {
        const record = library.require(requireString(requireObject(params), 'id'));
        return { ...toSummary(record), definition: record.definition };
    });

    router.register('fixtures.validate', (params) => {
        const result = validateFixture(requireObject(params).definition);
        return result.ok ? [] : result.issues;
    });

    router.register('fixtures.save', (params) => {
        const input = requireObject(params);
        const previousId = optionalString(input, 'previousId');
        const record = library.save(input.definition, previousId, input.library === true);
        if (session.summary() !== null) {
            session.setPatch(followDefinition(session.patch(), previousId ?? record.id, record.id, record.definition));
        }
        changed();
        bus.emit('patch.changed', {});
        return toSummary(record);
    });

    router.register('fixtures.delete', (params) => {
        library.delete(requireString(requireObject(params), 'id'));
        changed();
        bus.emit('patch.changed', {});
        return undefined;
    });

    router.register('fixtures.import', (params) => {
        const input = requireObject(params);
        const files = requireStringArray(input, 'files').map((file) => pickedFile(file, session));
        if (files.length === 0) {
            return [];
        }
        const ids = library.importFiles(files, input.library === true);
        changed();
        bus.emit('patch.changed', {});
        return ids;
    });

    router.register('fixtures.readImage', (params) => {
        const file = pickedFile(requireString(requireObject(params), 'file'), session);
        const type = IMAGE_TYPES[path.extname(file).toLowerCase()];
        if (type === undefined || fs.statSync(file).size > MAX_IMAGE_BYTES) {
            throw new EngineError('invalid-params', 'Not an image that can be used as a gobo');
        }
        return `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
    });

    router.register('fixtures.export', (params) => {
        const input = requireObject(params);
        const record = library.require(requireString(input, 'id'));
        const target = pickedTarget(requireString(input, 'file'), FIXTURE_FILE_EXTENSION, session);
        fs.copyFileSync(record.file, target);
        return target;
    });
}
