/**
 * fixtures.* methods: the fixture library, with the editing of user
 * definitions, import and export. When a definition used by the open
 * show is saved again, the patch follows it (new identifier, new channel count).
 */

import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { validateFixture } from '../../shared/fixtures/validate-fixture';
import { FIXTURE_FILE_EXTENSION, toSummary, type FixtureLibrary } from '../fixtures/fixture-library';
import { followDefinition } from '../patch/patch-editor';
import type { ShowSession } from '../shows/show-session';
import type { EventBus } from '../transport/event-bus';
import { optionalString, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import { requireDesktop } from '../transport/require-desktop';
import { chooseFiles, chooseSaveFile } from '../window/file-dialogs';

const FILE_FILTER = { name: 'Backshade fixture', extensions: [FIXTURE_FILE_EXTENSION] };

/**
 * Registers the methods of the service.
 */
export function registerFixtureService(router: RequestRouter, bus: EventBus, session: ShowSession, library: FixtureLibrary): void {
    const changed = (): void => bus.emit('fixtures.changed', {});

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
        const record = library.saveUser(input.definition, previousId);
        if (session.summary() !== null) {
            session.setPatch(followDefinition(session.patch(), previousId ?? record.id, record.id, record.definition));
        }
        changed();
        bus.emit('patch.changed', {});
        return toSummary(record);
    });

    router.register('fixtures.delete', (params) => {
        library.deleteUser(requireString(requireObject(params), 'id'));
        changed();
        bus.emit('patch.changed', {});
        return undefined;
    });

    router.register('fixtures.import', async (_params, context) => {
        requireDesktop(context);
        const files = await chooseFiles([FILE_FILTER]);
        if (files.length === 0) {
            return [];
        }
        const ids = library.importFiles(files);
        changed();
        bus.emit('patch.changed', {});
        return ids;
    });

    router.register('fixtures.export', async (params, context) => {
        requireDesktop(context);
        const record = library.require(requireString(requireObject(params), 'id'));
        const target = await chooseSaveFile(
            [FILE_FILTER],
            path.join(app.getPath('documents'), `${record.id.replace('/', '-')}.${FIXTURE_FILE_EXTENSION}`)
        );
        if (target === null) {
            return null;
        }
        fs.copyFileSync(record.file, target);
        return target;
    });
}
