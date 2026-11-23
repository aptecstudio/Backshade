/**
 * Error of the engine methods with a stable code, which the interface
 * translates into a message for the user.
 */
export class EngineError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = 'EngineError';
        this.code = code;
    }
}
