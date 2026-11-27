/**
 * Single access to the engine for the whole interface. The channel is chosen
 * according to the environment: IPC in the Electron window, WebSocket in a
 * remote client, which connects it before the interface starts.
 */

import { EngineClient } from './engine-client.js';
import { createIpcChannel, isIpcAvailable } from './ipc-channel.js';
import type { TransportChannel } from './transport-channel.js';

let client: EngineClient | null = null;

/** The interface runs in a remote client (a browser on the network) */
export function isRemote(): boolean {
    return !isIpcAvailable();
}

/** Sets the channel of a remote client, before anything asks the engine */
export function useChannel(channel: TransportChannel): void {
    client = new EngineClient(channel);
}

/**
 * Returns the engine client, creating it on first use.
 */
export function engine(): EngineClient {
    if (client === null) {
        client = new EngineClient(createIpcChannel());
    }
    return client;
}
