/**
 * Metodi che aprono finestre dell'applicazione desktop. Dai client remoti
 * non sono disponibili, perché aprirebbero finestre sulla postazione.
 */

import type { RequestRouter } from '../transport/request-router';
import * as aboutWindow from '../window/about-window';

/**
 * Registra i metodi del servizio.
 */
export function registerWindowService(router: RequestRouter): void {
    router.register('window.openAbout', (_params, context) => {
        if (context.transport !== 'ipc') {
            throw new Error('Disponibile solo nell\'applicazione desktop');
        }
        aboutWindow.open();
        return undefined;
    });
}
