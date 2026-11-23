/**
 * Metodi show.*: crea, apre, salva, rinomina, recupera e chiude lo show.
 * Ogni cambio dello show aperto viene notificato con l'evento show.changed;
 * gli show aperti o creati entrano nei recenti.
 */

import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import type { OpenShowResult } from '../../shared/transport/engine-api';
import { addRecentShow } from '../shows/recent-shows';
import { isShowFolder } from '../shows/show-files';
import type { ShowSession } from '../shows/show-session';
import { findTemplate, TEMPLATE_ONLY_ENTRIES } from '../templates/template-library';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { optionalBoolean, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Registra i metodi del servizio.
 */
export function registerShowService(router: RequestRouter, bus: EventBus, session: ShowSession): void {
    const remember = (result: OpenShowResult): OpenShowResult => {
        addRecentShow(result.show.name, result.show.folder);
        bus.emit('recent.changed', {});
        return result;
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
        if (context.transport !== 'ipc') {
            throw new EngineError('desktop-only', 'Disponibile solo nell\'applicazione desktop');
        }
        const window = BrowserWindow.getFocusedWindow();
        const options: Electron.OpenDialogOptions = { properties: ['openDirectory'] };
        const choice = window === null ? await dialog.showOpenDialog(options) : await dialog.showOpenDialog(window, options);
        if (choice.canceled || choice.filePaths.length === 0) {
            return null;
        }
        const folder = choice.filePaths[0];
        if (!isShowFolder(folder)) {
            throw new EngineError('show-not-found', `Nessuno show nella cartella: ${folder}`);
        }
        return remember(session.open(folder));
    });

    router.register('show.save', () => {
        const summary = session.save();
        remember({ show: summary, recoveryAvailable: false });
        return summary;
    });

    router.register('show.saveAs', (params) => {
        const input = requireObject(params);
        const summary = session.saveAs(requireString(input, 'name'), path.resolve(requireString(input, 'folder')));
        remember({ show: summary, recoveryAvailable: false });
        return summary;
    });

    router.register('show.rename', (params) => session.rename(requireString(requireObject(params), 'name')));

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
