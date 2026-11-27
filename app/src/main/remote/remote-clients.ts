/**
 * Remote clients connected with a WebSocket: their requests run through the
 * router like the ones of the windows, the engine events reach them, and
 * their connection closes (4001) as soon as their session is no longer the
 * one of the operator entered, unless they are waiting to enter again.
 */

import { isRequestMessage, type ResponseMessage } from '../../shared/transport/protocol';
import type { EngineEvent, EngineMethod } from '../../shared/transport/engine-api';
import type { EventBus } from '../transport/event-bus';
import type { RequestRouter } from '../transport/request-router';
import { HeldControls } from './held-controls';
import type { RemoteAuth } from './remote-auth';
import { ENTRIES, SHOW_CHANGES, WAIT_ATTEMPTS, WAIT_MS, WAITING_METHODS } from './remote-entry';
import { LOCAL_ONLY_EVENTS, LOCAL_ONLY_METHODS } from './remote-methods';
import type { WebSocketConnection } from './websocket';

/** Close code of a session that ended */
export const SESSION_ENDED = 4001;

interface Client {
    connection: WebSocketConnection;
    token: string;
    held: HeldControls;
    /** Waiting to enter again: the timer that ends the wait, null when not waiting */
    waiting: NodeJS.Timeout | null;
    wrongPins: number;
    /** A request that changes the operator is running: the client is judged when it answers */
    changing: boolean;
}

export class RemoteClients {
    private readonly router: RequestRouter;
    private readonly auth: RemoteAuth;
    private readonly clients = new Set<Client>();

    constructor(router: RequestRouter, bus: EventBus, auth: RemoteAuth) {
        this.router = router;
        this.auth = auth;
        bus.addSink((message) => {
            if (LOCAL_ONLY_EVENTS.has(message.event as EngineEvent)) {
                return;
            }
            const text = JSON.stringify(message);
            for (const client of [...this.clients]) {
                const valid = this.auth.isValid(client.token);
                // Its operator is back: a waiting client is in again
                if (valid && !client.changing) {
                    this.stopWaiting(client);
                }
                // A waiting client keeps its place until someone else enters
                if (valid || client.changing || (client.waiting !== null && !this.auth.open)) {
                    client.connection.send(text);
                } else {
                    client.connection.close(SESSION_ENDED);
                }
            }
            this.auth.revokeEnded();
        });
    }

    /** Adds a connection of a client with a valid session */
    add(connection: WebSocketConnection, token: string): void {
        const client: Client = { connection, token, held: new HeldControls(), waiting: null, wrongPins: 0, changing: false };
        this.clients.add(client);
        connection.onMessage((text) => void this.receive(client, text));
        connection.onClose(() => {
            this.clients.delete(client);
            this.stopWaiting(client);
            // Released by the engine itself: the client may be gone because its operator left
            for (const release of client.held.releases()) {
                void this.router.handle({ type: 'request', id: 0, ...release }, { transport: 'internal' });
            }
        });
    }

    closeAll(): void {
        for (const client of [...this.clients]) {
            client.connection.close(1001);
        }
    }

    private async receive(client: Client, text: string): Promise<void> {
        let message: unknown;
        try {
            message = JSON.parse(text);
        } catch {
            client.connection.close(1003);
            return;
        }
        if (!isRequestMessage(message)) {
            client.connection.close(1003);
            return;
        }
        const refuse = (code: string, reason: string): void => {
            client.connection.send(JSON.stringify({ type: 'response', id: (message as { id: number }).id, ok: false, error: { code, message: reason } }));
        };
        const waiting = client.waiting !== null;
        if (!this.auth.isValid(client.token)) {
            if (!waiting) {
                client.connection.close(SESSION_ENDED);
                return;
            }
            if (!WAITING_METHODS.has(message.method)) {
                refuse('operator-required', 'Enter the PIN of an operator');
                return;
            }
        }
        // Only a waiting client enters with a PIN: the others already act as the operator entered
        if (LOCAL_ONLY_METHODS.has(message.method as EngineMethod) && !(message.method === 'operators.login' && waiting)) {
            refuse('desktop-only', 'Not available to remote clients');
            return;
        }
        const changing = SHOW_CHANGES.has(message.method) || (waiting && ENTRIES.has(message.method));
        if (changing) {
            client.changing = true;
            // Kept while the request runs: the operator leaves before the client is judged
            this.auth.waiting.add(client.token);
        }
        // Followed before it runs: a disconnection while it runs releases it too
        client.held.follow(message.method, message.params);
        const response = await this.router.handle(message, { transport: 'remote' });
        client.connection.send(JSON.stringify(response));
        if (changing) {
            client.changing = false;
            this.settle(client, message.method, response);
        }
    }

    /** Where a client stands after a request that changes the operator */
    private settle(client: Client, method: string, response: ResponseMessage): void {
        if (!response.ok) {
            if (response.error.code === 'wrong-pin' && ++client.wrongPins >= WAIT_ATTEMPTS) {
                client.connection.close(SESSION_ENDED);
            }
        } else if (this.auth.open && ENTRIES.has(method)) {
            // Entered with its own PIN: the session now belongs to that operator
            this.auth.rebind(client.token);
            this.stopWaiting(client);
        } else if (!this.auth.open && SHOW_CHANGES.has(method)) {
            this.startWaiting(client);
        }
        if (this.auth.isValid(client.token)) {
            this.stopWaiting(client);
        } else if (client.waiting === null) {
            this.auth.waiting.delete(client.token);
            client.connection.close(SESSION_ENDED);
        }
    }

    private startWaiting(client: Client): void {
        this.stopWaiting(client);
        client.wrongPins = 0;
        client.waiting = setTimeout(() => client.connection.close(SESSION_ENDED), WAIT_MS);
        client.waiting.unref();
        this.auth.waiting.add(client.token);
    }

    private stopWaiting(client: Client): void {
        if (client.waiting !== null) {
            clearTimeout(client.waiting);
            client.waiting = null;
        }
        this.auth.waiting.delete(client.token);
    }
}
