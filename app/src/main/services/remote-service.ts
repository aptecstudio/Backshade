/**
 * remote.* methods and the web server of the remote control: it starts with
 * the application, tells the addresses where it can be reached, and finds
 * the other instances of the network.
 */

import os from 'node:os';
import { Discovery } from '../network/discovery';
import { RemoteAuth } from '../remote/remote-auth';
import { RemoteClients } from '../remote/remote-clients';
import { WebServer } from '../remote/web-server';
import { readSettings } from '../settings/app-settings';
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
export function registerRemoteService(router: RequestRouter, bus: EventBus, operators: OperatorSessionInfo): { stop: () => void } {
    const auth = new RemoteAuth(operators);
    const server = new WebServer(auth, new RemoteClients(router, bus, auth));
    router.register('remote.getInfo', () => ({
        port: server.port,
        addresses: server.port === null ? [] : localAddresses().map((address) => `http://${address}:${server.port}`)
    }));
    const discovery = new Discovery(() => readSettings().instanceName, () => server.port);
    router.register('remote.discover', () => discovery.search());
    server.start();
    discovery.start();
    return {
        stop: () => {
            discovery.stop();
            server.stop();
        }
    };
}
