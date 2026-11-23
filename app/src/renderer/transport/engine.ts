/**
 * Accesso unico al motore per tutta l'interfaccia. Il canale viene scelto
 * in base all'ambiente: IPC nella finestra Electron; il WebSocket per i
 * client remoti arriverà con la fase 10.
 */

import { EngineClient } from './engine-client.js';
import { createIpcChannel } from './ipc-channel.js';

let client: EngineClient | null = null;

/**
 * Restituisce il client del motore, creandolo al primo uso.
 */
export function engine(): EngineClient {
    if (client === null) {
        client = new EngineClient(createIpcChannel());
    }
    return client;
}
