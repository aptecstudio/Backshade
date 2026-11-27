/**
 * show.* methods: create, open, save, rename, recover and close the show.
 * Every change of the open show is notified with the show.changed event;
 * opened or created shows go into the recent shows.
 */

import type { OpenShowResult } from '../../shared/transport/engine-api';
import type { FixtureLibrary } from '../fixtures/fixture-library';
import { newAdministrator } from '../operators/new-operator';
import type { OperatorSessionInfo } from './operator-service';
import { missingFixtures } from '../patch/patch-editor';
import { ARCHIVE_EXTENSIONS, packFolder, unpackArchive } from '../archive/backshade-archive';
import { readSettings } from '../settings/app-settings';
import { addRecentShow } from '../shows/recent-shows';
import { TRANSIENT_ENTRIES } from '../shows/show-files';
import type { SessionOpenResult, ShowSession } from '../shows/show-session';
import { findTemplate, TEMPLATE_ONLY_ENTRIES } from '../templates/template-library';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { optionalBoolean, optionalString, requireObject, requireString } from '../transport/params';
import { TIMECODE_RATES, type ShowSettings, type TimecodeRate } from '../../shared/show/show-settings';
import type { RequestRouter } from '../transport/request-router';
import { pickedFile, pickedTarget } from '../files/picked-paths';
import { requestedFolder } from '../files/remote-folder';

/**
 * Registers the methods of the service.
 */
export function registerShowService(router: RequestRouter, bus: EventBus, session: ShowSession, library: FixtureLibrary, operators: OperatorSessionInfo): void {
    // Opened shows go into the recent shows and report the definitions missing on this workstation
    const remember = (result: SessionOpenResult): OpenShowResult => {
        addRecentShow(result.show.name, result.show.folder);
        bus.emit('recent.changed', {});
        library.reload();
        return { ...result, missingFixtures: missingFixtures(session.patch(), (id) => library.find(id)?.definition) };
    };

    router.register('show.getCurrent', () => session.summary());

    router.register('show.create', (params, context) => {
        const input = requireObject(params);
        const template = findTemplate(requireString(input, 'templateId'));
        const folder = requestedFolder(requireString(input, 'folder'), context, session.summary()?.folder ?? null);
        const admin = requireObject(input.admin);
        const pin = requireString(admin, 'pin');
        // Checked before the folder is made: a wrong PIN never leaves a half-made show
        const administrator = newAdministrator(requireString(admin, 'name'), pin);
        const result = session.create(requireString(input, 'name'), folder, template.folder, TEMPLATE_ONLY_ENTRIES, administrator);
        // Who creates the show is already its operator
        operators.signIn(administrator.id, pin);
        return remember(result);
    });

    router.register('show.open', (params, context) => {
        const folder = requestedFolder(requireString(requireObject(params), 'folder'), context, session.summary()?.folder ?? null);
        return remember(session.open(folder));
    });

    router.register('show.export', async (params) => {
        const show = session.summary();
        if (show === null) {
            throw new EngineError('no-show', 'No show open');
        }
        if (show.dirty) {
            throw new EngineError('unsaved-changes', 'Save the show before exporting it');
        }
        const target = pickedTarget(requireString(requireObject(params), 'file'), ARCHIVE_EXTENSIONS.show, session);
        await packFolder(show.folder, target, 'show', show.name, TRANSIENT_ENTRIES);
        return target;
    });

    router.register('show.import', async (params) => {
        if (session.dirty) {
            throw new EngineError('unsaved-changes', 'The open show has unsaved changes');
        }
        const archive = pickedFile(requireString(requireObject(params), 'file'), session);
        const folder = await unpackArchive(archive, readSettings().defaultShowsFolder, 'show');
        return remember(session.open(folder));
    });

    router.register('show.save', () => {
        const summary = session.save();
        addRecentShow(summary.name, summary.folder);
        bus.emit('recent.changed', {});
        return summary;
    });

    router.register('show.saveAs', (params, context) => {
        const input = requireObject(params);
        const summary = session.saveAs(requireString(input, 'name'), requestedFolder(requireString(input, 'folder'), context, session.summary()?.folder ?? null));
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
