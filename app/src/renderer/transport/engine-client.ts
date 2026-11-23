/**
 * Typed engine client: method calls and events, with the types
 * of the contract in shared/transport/engine-api.ts.
 */

import type { Unsubscribe } from '../../framework/ts/index.js';
import type { EngineEvent, EngineEvents, EngineMethod, EngineMethods } from '../../shared/transport/engine-api.js';
import type { TransportChannel } from './transport-channel.js';

/** Error returned by the engine */
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
     * Calls an engine method and returns its result.
     * @throws EngineRequestError if the engine answers with an error
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
     * Registers a listener for an engine event.
     */
    on<E extends EngineEvent>(event: E, listener: (payload: EngineEvents[E]) => void): Unsubscribe {
        return this.channel.onEvent((message) => {
            if (message.event === event) {
                listener(message.payload as EngineEvents[E]);
            }
        });
    }
}
