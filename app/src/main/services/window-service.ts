/**
 * Methods of the desktop application windows: About window,
 * folder choice, confirmed close and fullscreen of the main window. They are not available
 * to remote clients, because they would act on the workstation.
 */

import type { EventBus } from '../transport/event-bus';
import { optionalString, requireObject } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import { requireDesktop } from '../transport/require-desktop';
import * as aboutWindow from '../window/about-window';
import { chooseFolder } from '../window/file-dialogs';
import * as mainWindow from '../window/main-window';

/**
 * Registers the methods of the service.
 */
export function registerWindowService(router: RequestRouter, bus: EventBus): void {
    mainWindow.onFullScreen((on) => bus.emit('window.fullScreenChanged', { on }));

    router.register('window.isFullScreen', (_params, context) => {
        requireDesktop(context);
        return mainWindow.isFullScreen();
    });

    router.register('window.toggleFullScreen', (_params, context) => {
        requireDesktop(context);
        return mainWindow.toggleFullScreen();
    });

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
