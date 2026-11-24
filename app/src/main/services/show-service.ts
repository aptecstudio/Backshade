/**
 * show.* methods: create, open, save, rename, recover and close the show.
 * Every change of the open show is notified with the show.changed event;
 * opened or created shows go into the recent shows.
 */

import path from 'node:path';
import type { OpenShowResult } from '../../shared/transport/engine-api';
import type { FixtureLibrary } from '../fixtures/fixture-library';
import { missingFixtures } from '../patch/patch-editor';
import { ARCHIVE_EXTENSIONS, packFolder, unpackArchive } from '../archive/backshade-archive';
import { readSettings } from '../settings/app-settings';
import { addRecentShow } from '../shows/recent-shows';
import { isShowFolder, TRANSIENT_ENTRIES } from '../shows/show-files';
import type { SessionOpenResult, ShowSession } from '../shows/show-session';
import { findTemplate, TEMPLATE_ONLY_ENTRIES } from '../templates/template-library';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { optionalBoolean, optionalString, requireObject, requireString } from '../transport/params';
import { TIMECODE_RATES, type ShowSettings, type TimecodeRate } from '../../shared/show/show-settings';
import type { RequestRouter } from '../transport/request-router';
import { requireDesktop } from '../transport/require-desktop';
import { chooseFile, chooseFolder, chooseSaveFile } from '../window/file-dialogs';

/**
 * Registers the methods of the service.
 */
export function registerShowService(router: RequestRouter, bus: EventBus, session: ShowSession, library: FixtureLibrary): void {
    // Opened shows go into the recent shows and report the definitions missing on this workstation
    const remember = (result: SessionOpenResult): OpenShowResult => {
        addRecentShow(result.show.name, result.show.folder);
        bus.emit('recent.changed', {});
        library.reload();
        return { ...result, missingFixtures: missingFixtures(session.patch(), (id) => library.find(id)?.definition) };
    };

    router.register('show.getCurrent', () => session.summary());

    router.register('show.create', (params) => {
        const input = requireObject(params);
        const template = findTemplate(requireString(input, 'templateId'));
        const folder = path.resolve(requireString(input, 'folder'));
        return remember(session.create(requireString(input, 'name'), folder, template.folder, TEMPLATE_ONLY_ENTRIES));
    });

    router.register('show.open', (params) => {
        const folder = path.resolve(requireString(requireObject(params), 'folder'));
        return remember(session.open(folder));
    });

    router.register('show.chooseAndOpen', async (_params, context) => {
        requireDesktop(context);
        const folder = await chooseFolder(readSettings().defaultShowsFolder);
        if (folder === null) {
            return null;
        }
        if (!isShowFolder(folder)) {
            throw new EngineError('show-not-found', `No show in the folder: ${folder}`);
        }
        return remember(session.open(folder));
    });

    router.register('show.export', async (_params, context) => {
        requireDesktop(context);
        const show = session.summary();
        if (show === null) {
            throw new EngineError('no-show', 'No show open');
        }
        if (show.dirty) {
            throw new EngineError('unsaved-changes', 'Save the show before exporting it');
        }
        const target = await chooseSaveFile(
            [{ name: 'Backshade show', extensions: [ARCHIVE_EXTENSIONS.show] }],
            path.join(readSettings().defaultShowsFolder, `${show.name}.${ARCHIVE_EXTENSIONS.show}`)
        );
        if (target === null) {
            return null;
        }
        await packFolder(show.folder, target, 'show', show.name, TRANSIENT_ENTRIES);
        return target;
    });

    router.register('show.import', async (_params, context) => {
        requireDesktop(context);
        if (session.dirty) {
            throw new EngineError('unsaved-changes', 'The open show has unsaved changes');
        }
        const archive = await chooseFile([{ name: 'Backshade show', extensions: [ARCHIVE_EXTENSIONS.show] }]);
        if (archive === null) {
            return null;
        }
        const folder = await unpackArchive(archive, readSettings().defaultShowsFolder, 'show');
        return remember(session.open(folder));
    });

    router.register('show.save', () => {
        const summary = session.save();
        addRecentShow(summary.name, summary.folder);
        bus.emit('recent.changed', {});
        return summary;
    });

    router.register('show.saveAs', (params) => {
        const input = requireObject(params);
        const summary = session.saveAs(requireString(input, 'name'), path.resolve(requireString(input, 'folder')));
        addRecentShow(summary.name, summary.folder);
        bus.emit('recent.changed', {});
        return summary;
    });

    router.register('show.rename', (params) => session.rename(requireString(requireObject(params), 'name')));

    router.register('show.getSettings', () => session.settings());

    router.register('show.updateSettings', (params) => {
        const input = requireObject(params);
        const changes: Partial<ShowSettings> = {};
        const description = optionalString(input, 'description');
        const notes = optionalString(input, 'notes');
        const rate = optionalString(input, 'timecodeRate');
        if (description !== undefined) {
            changes.description = description;
        }
        if (notes !== undefined) {
            changes.notes = notes;
        }
        if (rate !== undefined) {
            if (!TIMECODE_RATES.includes(rate as TimecodeRate)) {
                throw new EngineError('invalid-params', `Invalid frame rate: ${rate}`);
            }
            changes.timecodeRate = rate as TimecodeRate;
        }
        for (const field of ['fadeInSeconds', 'fadeOutSeconds'] as const) {
            const value = input[field];
            if (value === undefined) {
                continue;
            }
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                throw new EngineError('invalid-params', `Invalid field "${field}"`);
            }
            changes[field] = value;
        }
        return session.updateSettings(changes);
    });

    router.register('show.recover', () => session.recover());

    router.register('show.discardRecovery', () => {
        session.discardRecovery();
        return undefined;
    });

    router.register('show.close', (params) => {
        const discard = params === undefined ? false : optionalBoolean(requireObject(params), 'discard') === true;
        session.close(discard);
        return undefined;
    });
}
