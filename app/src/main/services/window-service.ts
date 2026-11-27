/**
 * Methods of the desktop application windows: About window,
 * folder choice, confirmed close and fullscreen of the main window. They are not available
 * to remote clients, because they would act on the workstation.
 */

import type { EventBus } from '../transport/event-bus';
import type { RequestRouter } from '../transport/request-router';
import { requireDesktop } from '../transport/require-desktop';
import * as aboutWindow from '../window/about-window';
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

    router.register('app.confirmClose', (_params, context) => {
        requireDesktop(context);
        mainWindow.closeConfirmed();
        return undefined;
    });
}
