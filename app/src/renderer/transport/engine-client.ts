/**
 * Client tipizzato del motore: chiamate ai metodi ed eventi, con i tipi
 * del contratto in shared/transport/engine-api.ts.
 */

import type { Unsubscribe } from '../../framework/ts/index.js';
import type { EngineEvent, EngineEvents, EngineMethod, EngineMethods } from '../../shared/transport/engine-api.js';
import type { TransportChannel } from './transport-channel.js';

/** Errore restituito dal motore */
export class EngineRequestError extends Error {
    readonly code: string;

    constructor(method: string, code: string, message: string) {
        super(`${method}: ${message}`);
        this.name = 'EngineRequestError';
        this.code = code;
    }
}

export class EngineClient {
    private readonly channel: TransportChannel;
    private nextId = 1;

    constructor(channel: TransportChannel) {
        this.channel = channel;
    }

    /**
     * Chiama un metodo del motore e restituisce il risultato.
     * @throws EngineRequestError se il motore risponde con un errore
     */
    async request<M extends EngineMethod>(
        method: M,
        params?: EngineMethods[M]['params']
    ): Promise<EngineMethods[M]['result']> {
        const id = this.nextId++;
        const response = await this.channel.request({ type: 'request', id, method, params });

        if (!response.ok) {
            throw new EngineRequestError(method, response.error.code, response.error.message);
        }
        return response.result as EngineMethods[M]['result'];
    }

    /**
     * Registra un listener per un evento del motore.
     */
    on<E extends EngineEvent>(event: E, listener: (payload: EngineEvents[E]) => void): Unsubscribe {
        return this.channel.onEvent((message) => {
            if (message.event === event) {
                listener(message.payload as EngineEvents[E]);
            }
        });
    }
}
