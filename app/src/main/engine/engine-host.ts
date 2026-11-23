/**
 * Avvio del motore: crea router delle richieste, bus degli eventi e
 * sessione dello show, registra i servizi e collega i trasporti. È l'unico
 * punto che conosce tutti i servizi; i servizi non si conoscono tra loro.
 */

import { app } from 'electron';
import { startCloseGuard } from '../services/close-guard-service';
import { registerAppInfoService } from '../services/app-info-service';
import { startLocaleService } from '../services/locale-service';
import { registerRecentService } from '../services/recent-service';
import { registerSettingsService } from '../services/settings-service';
import { registerShowService } from '../services/show-service';
import { registerTemplateService } from '../services/template-service';
import { registerWindowService } from '../services/window-service';
import { ShowSession } from '../shows/show-session';
import { EventBus } from '../transport/event-bus';
import { attachIpcTransport } from '../transport/ipc-transport';
import { RequestRouter } from '../transport/request-router';

/**
 * Avvia il motore. Va chiamata una volta, dopo app.whenReady().
 */
export function startEngine(): void {
    const router = new RequestRouter();
    const bus = new EventBus();
    const session = new ShowSession((show) => bus.emit('show.changed', { show }));

    registerAppInfoService(router);
    registerWindowService(router);
    registerSettingsService(router);
    registerShowService(router, bus, session);
    registerRecentService(router, bus);
    registerTemplateService(router, bus, session);
    startLocaleService(bus);
    startCloseGuard(bus, session);

    attachIpcTransport(router, bus);

    // All'uscita la copia di recupero resta solo se ci sono modifiche non salvate
    app.on('before-quit', () => {
        session.autosave();
        session.dispose();
    });
}
