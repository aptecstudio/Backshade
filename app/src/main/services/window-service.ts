/**
 * Metodi delle finestre dell'applicazione desktop: finestra Informazioni,
 * scelta di una cartella e chiusura confermata. Dai client remoti non sono
 * disponibili, perché agirebbero sulla postazione.
 */

import { BrowserWindow, dialog } from 'electron';
import { EngineError } from '../transport/engine-error';
import { optionalString, requireObject } from '../transport/params';
import type { RequestContext, RequestRouter } from '../transport/request-router';
import * as aboutWindow from '../window/about-window';
import * as mainWindow from '../window/main-window';

function requireDesktop(context: RequestContext): void {
    if (context.transport !== 'ipc') {
        throw new EngineError('desktop-only', 'Disponibile solo nell\'applicazione desktop');
    }
}

/**
 * Registra i metodi del servizio.
 */
export function registerWindowService(router: RequestRouter): void {
    router.register('window.openAbout', (_params, context) => {
        requireDesktop(context);
        aboutWindow.open();
        return undefined;
    });

    router.register('dialog.chooseFolder', async (params, context) => {
        requireDesktop(context);
        const defaultPath = params === undefined ? undefined : optionalString(requireObject(params), 'defaultPath');
        const options: Electron.OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'], defaultPath };
        const window = BrowserWindow.getFocusedWindow();
        const choice = window === null ? await dialog.showOpenDialog(options) : await dialog.showOpenDialog(window, options);
        return choice.canceled || choice.filePaths.length === 0 ? null : choice.filePaths[0];
    });

    router.register('app.confirmClose', (_params, context) => {
        requireDesktop(context);
        mainWindow.closeConfirmed();
        return undefined;
    });
}
