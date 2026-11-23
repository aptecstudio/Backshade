/**
 * Protocollo dei messaggi tra interfaccia e motore. È lo stesso per ogni
 * trasporto: IPC nella finestra Electron, WebSocket per i client remoti
 * (fase 10). I messaggi sono oggetti JSON.
 *
 * - request: l'interfaccia chiede al motore di eseguire un metodo;
 * - response: il motore risponde a una richiesta, con lo stesso id;
 * - event: il motore notifica un cambiamento a tutte le interfacce collegate.
 */

/** Versione del protocollo */
export const PROTOCOL_VERSION = 1;

/** Richiesta dall'interfaccia al motore */
export interface RequestMessage {
    type: 'request';
    /** Identificativo scelto dal client, ripetuto nella risposta */
    id: number;
    /** Nome del metodo, ad esempio "app.getInfo" */
    method: string;
    /** Parametri del metodo */
    params?: unknown;
}

/** Errore restituito da una richiesta */
export interface ResponseError {
    /** Codice stabile, ad esempio "unknown-method" */
    code: string;
    /** Descrizione per il log, non mostrata all'utente */
    message: string;
}

/** Risposta riuscita */
export interface SuccessResponse {
    type: 'response';
    id: number;
    ok: true;
    result: unknown;
}

/** Risposta con errore */
export interface ErrorResponse {
    type: 'response';
    id: number;
    ok: false;
    error: ResponseError;
}

/** Risposta del motore a una richiesta */
export type ResponseMessage = SuccessResponse | ErrorResponse;

/** Evento dal motore alle interfacce */
export interface EventMessage {
    type: 'event';
    /** Nome dell'evento, ad esempio "locales.changed" */
    event: string;
    /** Dati dell'evento */
    payload: unknown;
}

/**
 * Indica se un valore ricevuto è una richiesta valida.
 * I messaggi arrivano anche da client remoti: vanno sempre verificati.
 */
export function isRequestMessage(value: unknown): value is RequestMessage {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const message = value as Partial<RequestMessage>;
    return message.type === 'request'
        && typeof message.id === 'number'
        && Number.isInteger(message.id)
        && typeof message.method === 'string';
}
