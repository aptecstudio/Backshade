/**
 * Single access to the engine for the whole interface. The channel is chosen
 * according to the environment: IPC in the Electron window; WebSocket for
 * remote clients will come with Phase 10.
 */

import { EngineClient } from './engine-client.js';
import { createIpcChannel } from './ipc-channel.js';

let client: EngineClient | null = null;

/**
 * Returns the engine client, creating it on first use.
 */
export function engine(): EngineClient {
    if (client === null) {
        client = new EngineClient(createIpcChannel());
    }
    return client;
}
