/**
 * Message protocol between interface and engine. It is the same for every
 * transport: IPC in the Electron window, WebSocket for remote clients
 * (Phase 10). Messages are JSON objects.
 *
 * - request: the interface asks the engine to run a method;
 * - response: the engine answers a request, with the same id;
 * - event: the engine notifies a change to all connected interfaces.
 */

/** Protocol version */
export const PROTOCOL_VERSION = 1;

/** Request from the interface to the engine */
export interface RequestMessage {
    type: 'request';
    /** Identifier chosen by the client, repeated in the response */
    id: number;
    /** Method name, for example "app.getInfo" */
    method: string;
    /** Method parameters */
    params?: unknown;
}

/** Error returned by a request */
export interface ResponseError {
    /** Stable code, for example "unknown-method" */
    code: string;
    /** Description for the log, not shown to the user */
    message: string;
}

/** Successful response */
export interface SuccessResponse {
    type: 'response';
    id: number;
    ok: true;
    result: unknown;
}

/** Error response */
export interface ErrorResponse {
    type: 'response';
    id: number;
    ok: false;
    error: ResponseError;
}

/** Engine response to a request */
export type ResponseMessage = SuccessResponse | ErrorResponse;

/** Event from the engine to the interfaces */
export interface EventMessage {
    type: 'event';
    /** Event name, for example "locales.changed" */
    event: string;
    /** Event data */
    payload: unknown;
}

/**
 * Tells whether a received value is a valid request.
 * Messages also come from remote clients: they must always be checked.
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
