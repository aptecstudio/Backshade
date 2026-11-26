/**
 * Dispatch of requests to the engine methods. It is independent of the
 * transport: IPC and, in the future, WebSocket use the same router.
 */

import type { EngineMethod, EngineMethods } from '../../shared/transport/engine-api';
import { isRequestMessage, type ResponseMessage } from '../../shared/transport/protocol';
import { EngineError } from './engine-error';

/** Origin of a request */
export interface RequestContext {
    /** Transport the request comes from */
    transport: 'ipc' | 'remote';
}

/**
 * Check run before every method; it throws an EngineError when the method
 * is not allowed.
 */
export type RequestGuard = (method: EngineMethod, context: RequestContext) => void;

/** Handler of a method */
export type MethodHandler<M extends EngineMethod> = (
    params: unknown,
    context: RequestContext
) => EngineMethods[M]['result'] | Promise<EngineMethods[M]['result']>;

export class RequestRouter {
    private readonly handlers = new Map<string, MethodHandler<EngineMethod>>();
    private guard: RequestGuard | null = null;

    /**
     * Sets the check of the permissions run before every method.
     */
    setGuard(guard: RequestGuard): void {
        this.guard = guard;
    }

    /**
     * Registers the handler of a method. Parameters arrive as unknown:
     * the handler checks them before using them.
     */
    register<M extends EngineMethod>(method: M, handler: MethodHandler<M>): void {
        if (this.handlers.has(method)) {
            throw new Error(`Method already registered: ${method}`);
        }
        this.handlers.set(method, handler as MethodHandler<EngineMethod>);
    }

    /**
     * Runs a request and always returns a response, errors included.
     */
    async handle(message: unknown, context: RequestContext): Promise<ResponseMessage> {
        if (!isRequestMessage(message)) {
            return { type: 'response', id: -1, ok: false, error: { code: 'invalid-message', message: 'Invalid message' } };
        }

        const handler = this.handlers.get(message.method);
        if (handler === undefined) {
            return {
                type: 'response',
                id: message.id,
                ok: false,
                error: { code: 'unknown-method', message: `Unknown method: ${message.method}` }
            };
        }

        try {
            this.guard?.(message.method as EngineMethod, context);
            const result = await handler(message.params, context);
            return { type: 'response', id: message.id, ok: true, result };
        } catch (error) {
            if (error instanceof EngineError) {
                return { type: 'response', id: message.id, ok: false, error: { code: error.code, message: error.message } };
            }
            console.error(`Error in method ${message.method}`, error);
            const description = error instanceof Error ? error.message : String(error);
            return { type: 'response', id: message.id, ok: false, error: { code: 'method-failed', message: description } };
        }
    }
}
