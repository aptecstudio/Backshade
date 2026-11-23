/**
 * Funzioni esposte dal preload all'interfaccia (window.backshadeHost).
 * Presenti solo nella finestra Electron; nei client remoti non esistono.
 */

import type { EventMessage, RequestMessage, ResponseMessage } from './protocol.js';

/** Trasporto dei messaggi verso il motore */
export interface HostTransport {
    /** Invia una richiesta e restituisce la risposta */
    request(message: RequestMessage): Promise<ResponseMessage>;
    /** Registra un listener per gli eventi; restituisce la funzione che lo rimuove */
    onEvent(listener: (message: EventMessage) => void): () => void;
}

/** Oggetto window.backshadeHost */
export interface HostBridge {
    /** Sistema operativo della postazione */
    readonly platform: string;
    /** Trasporto verso il motore */
    readonly transport: HostTransport;
}
