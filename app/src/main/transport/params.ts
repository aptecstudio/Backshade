/**
 * Verifica dei parametri delle richieste, che possono arrivare da client
 * remoti: ogni metodo controlla i propri parametri con queste funzioni.
 */

import { EngineError } from './engine-error';

/**
 * Restituisce i parametri come oggetto, o un errore se non lo sono.
 */
export function requireObject(params: unknown): Record<string, unknown> {
    if (typeof params !== 'object' || params === null || Array.isArray(params)) {
        throw new EngineError('invalid-params', 'Parametri mancanti o non validi');
    }
    return params as Record<string, unknown>;
}

/**
 * Restituisce un campo di testo obbligatorio.
 */
export function requireString(params: Record<string, unknown>, field: string): string {
    const value = params[field];
    if (typeof value !== 'string') {
        throw new EngineError('invalid-params', `Campo "${field}" mancante o non valido`);
    }
    return value;
}

/**
 * Restituisce un campo di testo opzionale.
 */
export function optionalString(params: Record<string, unknown>, field: string): string | undefined {
    const value = params[field];
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'string') {
        throw new EngineError('invalid-params', `Campo "${field}" non valido`);
    }
    return value;
}

/**
 * Restituisce un campo booleano opzionale.
 */
export function optionalBoolean(params: Record<string, unknown>, field: string): boolean | undefined {
    const value = params[field];
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'boolean') {
        throw new EngineError('invalid-params', `Campo "${field}" non valido`);
    }
    return value;
}
