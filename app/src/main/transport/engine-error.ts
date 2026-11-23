/**
 * Errore dei metodi del motore con un codice stabile, che l'interfaccia
 * traduce in un messaggio per l'utente.
 */
export class EngineError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = 'EngineError';
        this.code = code;
    }
}
