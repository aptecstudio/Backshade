/**
 * Functions exposed by the preload to the interface (window.backshadeHost).
 * Present only in the Electron window; they do not exist in remote clients.
 */

import type { EventMessage, RequestMessage, ResponseMessage } from './protocol.js';

/** Message transport to the engine */
export interface HostTransport {
    /** Sends a request and returns the response */
    request(message: RequestMessage): Promise<ResponseMessage>;
    /** Registers a listener for the events; returns the function that removes it */
    onEvent(listener: (message: EventMessage) => void): () => void;
}

/** window.backshadeHost object */
export interface HostBridge {
    /** Operating system of the workstation */
    readonly platform: string;
    /** Transport to the engine */
    readonly transport: HostTransport;
}
