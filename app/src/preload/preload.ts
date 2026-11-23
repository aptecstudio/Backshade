/**
 * Ponte sicuro tra processo main e interfaccia.
 * Espone solo un trasporto di messaggi generico, mai l'intero ipcRenderer:
 * l'interfaccia può soltanto inviare richieste e ricevere eventi.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { HostBridge } from '../shared/transport/host-bridge';
import type { EventMessage, ResponseMessage } from '../shared/transport/protocol';

// Uguali a shared/transport/ipc-channels.ts: il preload in sandbox non può importare altri file
const REQUEST_CHANNEL = 'backshade:request';
const EVENT_CHANNEL = 'backshade:event';

const bridge: HostBridge = {
    platform: process.platform,
    transport: {
        request: (message) => ipcRenderer.invoke(REQUEST_CHANNEL, message) as Promise<ResponseMessage>,
        onEvent: (listener) => {
            const handler = (_event: IpcRendererEvent, message: EventMessage): void => listener(message);
            ipcRenderer.on(EVENT_CHANNEL, handler);
            return () => {
                ipcRenderer.removeListener(EVENT_CHANNEL, handler);
            };
        }
    }
};

contextBridge.exposeInMainWorld('backshadeHost', bridge);
