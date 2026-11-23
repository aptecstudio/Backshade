/**
 * IPC transport for the Electron windows: receives the requests from the preload
 * and sends the events to all pages of the internal interface.
 * Accepts only messages from pages served by the app:// protocol.
 */

import { ipcMain, webContents, type IpcMainInvokeEvent } from 'electron';
import { EVENT_CHANNEL, REQUEST_CHANNEL } from '../../shared/transport/ipc-channels';
import type { ResponseMessage } from '../../shared/transport/protocol';
import * as appProtocol from '../protocol/app-protocol';
import type { EventBus } from './event-bus';
import type { RequestRouter } from './request-router';

/**
 * Tells whether the request comes from a page of the internal interface.
 */
function isTrustedSender(event: IpcMainInvokeEvent): boolean {
    return event.senderFrame !== null && appProtocol.isInternalUrl(event.senderFrame.url);
}

/**
 * Connects the IPC transport to the request router and to the event bus.
 */
export function attachIpcTransport(router: RequestRouter, bus: EventBus): void {
    ipcMain.handle(REQUEST_CHANNEL, (event, message: unknown): Promise<ResponseMessage> | ResponseMessage => {
        if (!isTrustedSender(event)) {
            return { type: 'response', id: -1, ok: false, error: { code: 'forbidden', message: 'Origin not allowed' } };
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
