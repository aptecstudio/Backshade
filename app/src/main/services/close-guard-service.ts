/**
 * Protezione alla chiusura: se lo show ha modifiche non salvate, la
 * finestra principale non si chiude subito e l'interfaccia riceve
 * app.closeRequested, per chiedere all'utente se salvare.
 */

import type { ShowSession } from '../shows/show-session';
import type { EventBus } from '../transport/event-bus';
import * as mainWindow from '../window/main-window';

/**
 * Attiva la protezione sulla finestra principale.
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
