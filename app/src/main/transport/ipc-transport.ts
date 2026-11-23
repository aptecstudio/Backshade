/**
 * Trasporto IPC per le finestre Electron: riceve le richieste dal preload
 * e invia gli eventi a tutte le pagine dell'interfaccia interna.
 * Accetta solo messaggi da pagine servite dal protocollo app://.
 */

import { ipcMain, webContents, type IpcMainInvokeEvent } from 'electron';
import { EVENT_CHANNEL, REQUEST_CHANNEL } from '../../shared/transport/ipc-channels';
import type { ResponseMessage } from '../../shared/transport/protocol';
import * as appProtocol from '../protocol/app-protocol';
import type { EventBus } from './event-bus';
import type { RequestRouter } from './request-router';

/**
 * Indica se la richiesta arriva da una pagina dell'interfaccia interna.
 */
function isTrustedSender(event: IpcMainInvokeEvent): boolean {
    return event.senderFrame !== null && appProtocol.isInternalUrl(event.senderFrame.url);
}

/**
 * Collega il trasporto IPC al router delle richieste e al bus degli eventi.
 */
export function attachIpcTransport(router: RequestRouter, bus: EventBus): void {
    ipcMain.handle(REQUEST_CHANNEL, (event, message: unknown): Promise<ResponseMessage> | ResponseMessage => {
        if (!isTrustedSender(event)) {
            return { type: 'response', id: -1, ok: false, error: { code: 'forbidden', message: 'Origine non ammessa' } };
        }
        return router.handle(message, { transport: 'ipc' });
    });

    bus.addSink((message) => {
        for (const contents of webContents.getAllWebContents()) {
            if (!contents.isDestroyed() && appProtocol.isInternalUrl(contents.getURL())) {
                contents.send(EVENT_CHANNEL, message);
            }
        }
    });
}
