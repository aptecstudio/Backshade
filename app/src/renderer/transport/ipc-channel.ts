/**
 * IPC channel: uses the transport exposed by the preload (window.backshadeHost),
 * present only in the Electron window.
 */

import type { HostBridge } from '../../shared/transport/host-bridge.js';
import type { TransportChannel } from './transport-channel.js';

declare global {
    interface Window {
        /** Bridge exposed by the preload; missing in remote clients */
        readonly backshadeHost?: HostBridge;
    }
}

/**
 * Tells whether the interface runs in the Electron window.
 */
export function isIpcAvailable(): boolean {
    return window.backshadeHost !== undefined;
}

/**
 * Creates the IPC channel.
 */
export function createIpcChannel(): TransportChannel {
    const host = window.backshadeHost;
    if (host === undefined) {
        throw new Error('IPC transport not available outside the Electron window');
    }
    return {
        request: (message) => host.transport.request(message),
        onEvent: (listener) => host.transport.onEvent(listener)
    };
}
