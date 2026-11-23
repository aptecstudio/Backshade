/**
 * Methods of the desktop application windows: About window,
 * folder choice and confirmed close. They are not available
 * to remote clients, because they would act on the workstation.
 */

import { EngineError } from '../transport/engine-error';
import { optionalString, requireObject } from '../transport/params';
import type { RequestContext, RequestRouter } from '../transport/request-router';
import * as aboutWindow from '../window/about-window';
import { chooseFolder } from '../window/file-dialogs';
import * as mainWindow from '../window/main-window';

function requireDesktop(context: RequestContext): void {
    if (context.transport !== 'ipc') {
        throw new EngineError('desktop-only', 'Available only in the desktop application');
    }
}

/**
 * Registers the methods of the service.
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
        return chooseFolder(defaultPath);
    });

    router.register('app.confirmClose', (_params, context) => {
        requireDesktop(context);
        mainWindow.closeConfirmed();
        return undefined;
    });
}
