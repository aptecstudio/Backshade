/**
 * Canale di trasporto verso il motore, indipendente dal mezzo:
 * IPC nella finestra Electron, WebSocket nei client remoti (fase 10).
 */

import type { Unsubscribe } from '../../framework/ts/index.js';
import type { EventMessage, RequestMessage, ResponseMessage } from '../../shared/transport/protocol.js';

export interface TransportChannel {
    /** Invia una richiesta e restituisce la risposta */
    request(message: RequestMessage): Promise<ResponseMessage>;
    /** Registra un listener per gli eventi */
    onEvent(listener: (message: EventMessage) => void): Unsubscribe;
}
