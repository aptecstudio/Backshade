/**
 * Secure bridge between the main process and the interface.
 * Exposes only a generic message transport, never the whole ipcRenderer:
 * the interface can only send requests and receive events.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { HostBridge } from '../shared/transport/host-bridge';
import type { EventMessage, ResponseMessage } from '../shared/transport/protocol';

// Equal to shared/transport/ipc-channels.ts: the sandboxed preload cannot import other files
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
