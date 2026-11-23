/**
 * Transport channel to the engine, independent of the medium:
 * IPC in the Electron window, WebSocket in remote clients (Phase 10).
 */

import type { Unsubscribe } from '../../framework/ts/index.js';
import type { EventMessage, RequestMessage, ResponseMessage } from '../../shared/transport/protocol.js';

export interface TransportChannel {
    /** Sends a request and returns the response */
    request(message: RequestMessage): Promise<ResponseMessage>;
    /** Registers a listener for the events */
    onEvent(listener: (message: EventMessage) => void): Unsubscribe;
}
