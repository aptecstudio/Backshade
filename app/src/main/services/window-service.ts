/**
 * Methods of the desktop application windows: About window,
 * folder choice and confirmed close. They are not available
 * to remote clients, because they would act on the workstation.
 */

import { optionalString, requireObject } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import { requireDesktop } from '../transport/require-desktop';
import * as aboutWindow from '../window/about-window';
import { chooseFolder } from '../window/file-dialogs';
import * as mainWindow from '../window/main-window';

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
