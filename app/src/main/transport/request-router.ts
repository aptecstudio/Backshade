/**
 * Smistamento delle richieste ai metodi del motore. È indipendente dal
 * trasporto: IPC e, in futuro, WebSocket usano lo stesso router.
 */

import type { EngineMethod, EngineMethods } from '../../shared/transport/engine-api';
import { isRequestMessage, type ResponseMessage } from '../../shared/transport/protocol';

/** Provenienza di una richiesta */
export interface RequestContext {
    /** Trasporto da cui arriva la richiesta */
    transport: 'ipc' | 'remote';
}

/** Gestore di un metodo */
export type MethodHandler<M extends EngineMethod> = (
    params: unknown,
    context: RequestContext
) => EngineMethods[M]['result'] | Promise<EngineMethods[M]['result']>;

export class RequestRouter {
    private readonly handlers = new Map<string, MethodHandler<EngineMethod>>();

    /**
     * Registra il gestore di un metodo. I parametri arrivano come unknown:
     * il gestore li verifica prima di usarli.
     */
    register<M extends EngineMethod>(method: M, handler: MethodHandler<M>): void {
        if (this.handlers.has(method)) {
            throw new Error(`Metodo già registrato: ${method}`);
        }
        this.handlers.set(method, handler as MethodHandler<EngineMethod>);
    }

    /**
     * Esegue una richiesta e restituisce sempre una risposta, anche in caso di errore.
     */
    async handle(message: unknown, context: RequestContext): Promise<ResponseMessage> {
        if (!isRequestMessage(message)) {
            return { type: 'response', id: -1, ok: false, error: { code: 'invalid-message', message: 'Messaggio non valido' } };
        }

        const handler = this.handlers.get(message.method);
        if (handler === undefined) {
            return {
                type: 'response',
                id: message.id,
                ok: false,
                error: { code: 'unknown-method', message: `Metodo sconosciuto: ${message.method}` }
            };
        }

        try {
            const result = await handler(message.params, context);
            return { type: 'response', id: message.id, ok: true, result };
        } catch (error) {
            console.error(`Errore nel metodo ${message.method}`, error);
            const description = error instanceof Error ? error.message : String(error);
            return { type: 'response', id: message.id, ok: false, error: { code: 'method-failed', message: description } };
        }
    }
}
