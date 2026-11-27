/**
 * remote.* methods and the web server of the remote control: it starts with
 * the application and tells the addresses where it can be reached.
 */

import os from 'node:os';
import { RemoteAuth } from '../remote/remote-auth';
import { RemoteClients } from '../remote/remote-clients';
import { WebServer } from '../remote/web-server';
import type { EventBus } from '../transport/event-bus';
import type { RequestRouter } from '../transport/request-router';
import type { OperatorSessionInfo } from './operator-service';

/** Addresses of this computer on its networks */
function localAddresses(): string[] {
    return Object.values(os.networkInterfaces())
        .flatMap((items) => items ?? [])
        .filter((item) => item.family === 'IPv4' && !item.internal)
        .map((item) => item.address);
}

/**
 * Registers the service and starts the web server.
 */
export function registerRemoteService(router: RequestRouter, bus: EventBus, operators: OperatorSessionInfo): WebServer {
    const auth = new RemoteAuth(operators);
    const server = new WebServer(auth, new RemoteClients(router, bus, auth));
    router.register('remote.getInfo', () => ({
        port: server.port,
        addresses: server.port === null ? [] : localAddresses().map((address) => `http://${address}:${server.port}`)
    }));
    server.start();
    return server;
}
