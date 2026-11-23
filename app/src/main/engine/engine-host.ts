/**
 * Avvio del motore: crea router delle richieste e bus degli eventi,
 * registra i servizi e collega i trasporti. È l'unico punto che conosce
 * tutti i servizi; i servizi non si conoscono tra loro.
 */

import { registerAppInfoService } from '../services/app-info-service';
import { startLocaleService } from '../services/locale-service';
import { registerWindowService } from '../services/window-service';
import { EventBus } from '../transport/event-bus';
import { attachIpcTransport } from '../transport/ipc-transport';
import { RequestRouter } from '../transport/request-router';

/**
 * Avvia il motore. Va chiamata una volta, dopo app.whenReady().
 */
export function startEngine(): void {
    const router = new RequestRouter();
    const bus = new EventBus();

    registerAppInfoService(router);
    registerWindowService(router);
    startLocaleService(bus);

    attachIpcTransport(router, bus);
}
