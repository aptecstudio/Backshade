/**
 * Remote clients connected with a WebSocket: their requests run through the
 * router like the ones of the windows, the engine events reach them, and
 * their connection closes (4001) as soon as their session is no longer the
 * one of the operator entered.
 */

import { isRequestMessage } from '../../shared/transport/protocol';
import type { EngineEvent } from '../../shared/transport/engine-api';
import type { EventBus } from '../transport/event-bus';
import type { RequestRouter } from '../transport/request-router';
import { HeldControls } from './held-controls';
import type { RemoteAuth } from './remote-auth';
import { LOCAL_ONLY_EVENTS, LOCAL_ONLY_METHODS } from './remote-methods';
import type { WebSocketConnection } from './websocket';

/** Close code of a session that ended */
export const SESSION_ENDED = 4001;

interface Client {
    connection: WebSocketConnection;
    token: string;
    held: HeldControls;
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
                if (this.auth.isValid(client.token)) {
                    client.connection.send(text);
                } else {
                    client.connection.close(SESSION_ENDED);
                }
            }
        });
    }

    /** Adds a connection of a client with a valid session */
    add(connection: WebSocketConnection, token: string): void {
        const client: Client = { connection, token, held: new HeldControls() };
        this.clients.add(client);
        connection.onMessage((text) => void this.receive(client, text));
        connection.onClose(() => {
            this.clients.delete(client);
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
        if (!this.auth.isValid(client.token)) {
            client.connection.close(SESSION_ENDED);
            return;
        }
        if (LOCAL_ONLY_METHODS.has(message.method as never)) {
            client.connection.send(JSON.stringify({ type: 'response', id: message.id, ok: false, error: { code: 'desktop-only', message: 'Not available to remote clients' } }));
            return;
        }
        // Followed before it runs: a disconnection while it runs releases it too
        client.held.follow(message.method, message.params);
        const response = await this.router.handle(message, { transport: 'remote' });
        client.connection.send(JSON.stringify(response));
    }
}
