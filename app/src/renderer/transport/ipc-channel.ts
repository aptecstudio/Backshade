/**
 * Canale IPC: usa il trasporto esposto dal preload (window.backshadeHost),
 * presente solo nella finestra Electron.
 */

import type { HostBridge } from '../../shared/transport/host-bridge.js';
import type { TransportChannel } from './transport-channel.js';

declare global {
    interface Window {
        /** Ponte esposto dal preload; assente nei client remoti */
        readonly backshadeHost?: HostBridge;
    }
}

/**
 * Indica se l'interfaccia gira nella finestra Electron.
 */
export function isIpcAvailable(): boolean {
    return window.backshadeHost !== undefined;
}

/**
 * Crea il canale IPC.
 */
export function createIpcChannel(): TransportChannel {
    const host = window.backshadeHost;
    if (host === undefined) {
        throw new Error('Trasporto IPC non disponibile fuori dalla finestra Electron');
    }
    return {
        request: (message) => host.transport.request(message),
        onEvent: (listener) => host.transport.onEvent(listener)
    };
}
