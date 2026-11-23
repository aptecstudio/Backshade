/**
 * Close protection: if the show has unsaved changes, the
 * main window does not close immediately and the interface receives
 * app.closeRequested, to ask the user whether to save.
 */

import type { ShowSession } from '../shows/show-session';
import type { EventBus } from '../transport/event-bus';
import * as mainWindow from '../window/main-window';

/**
 * Activates the protection on the main window.
 */
export function startCloseGuard(bus: EventBus, session: ShowSession): void {
    mainWindow.setCloseGuard(() => {
        if (!session.dirty) {
            return true;
        }
        bus.emit('app.closeRequested', {});
        return false;
    });
}
