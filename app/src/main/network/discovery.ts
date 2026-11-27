/**
 * Finding the instances on the local network with UDP (native dgram): a
 * search sends a question to the broadcast addresses, every instance
 * answers with its name and the port of its web server. Nothing else is
 * told: entering still needs the PIN.
 */

import { randomUUID } from 'node:crypto';
import dgram from 'node:dgram';
import os from 'node:os';
import { INSTANCE_NAME_LENGTH, type DiscoveredInstance } from '../../shared/remote/instance';

/** UDP port of the search */
const DISCOVERY_PORT = 4746;
const QUESTION = 'BACKSHADE-DISCOVER 1';
const SEARCH_MS = 1500;
const MAX_ANSWER_BYTES = 1024;

/** Broadcast addresses of the networks of this computer */
function broadcastAddresses(): string[] {
    const addresses = new Set<string>(['255.255.255.255']);
    for (const item of Object.values(os.networkInterfaces()).flatMap((items) => items ?? [])) {
        if (item.family !== 'IPv4' || item.internal) {
            continue;
        }
        const mask = item.netmask.split('.').map(Number);
        addresses.add(item.address.split('.').map((part, index) => (Number(part) | (~mask[index] & 0xff))).join('.'));
    }
    return [...addresses];
}

export class Discovery {
    /** Identifier of this running instance, to leave it out of its searches */
    private readonly id = randomUUID();
    private readonly name: () => string;
    private readonly port: () => number | null;
    private socket: dgram.Socket | null = null;

    /**
     * @param name - Name of this instance now
     * @param port - Port of its web server, null while not listening
     */
    constructor(name: () => string, port: () => number | null) {
        this.name = name;
        this.port = port;
    }

    /** Starts answering the searches */
    start(): void {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        socket.on('error', (error) => {
            console.warn('Instance discovery not available:', error.message);
            socket.close();
            this.socket = null;
        });
        socket.on('message', (message, sender) => {
            const port = this.port();
            if (message.toString('utf8') === QUESTION && port !== null) {
                socket.send(JSON.stringify({ app: 'Backshade', id: this.id, name: this.name(), port }), sender.port, sender.address);
            }
        });
        socket.bind(DISCOVERY_PORT);
        socket.unref();
        this.socket = socket;
    }

    stop(): void {
        this.socket?.close();
        this.socket = null;
    }

    /** Asks the network and gives the instances that answered, by name */
    search(): Promise<DiscoveredInstance[]> {
        return new Promise((resolve) => {
            const found = new Map<string, DiscoveredInstance>();
            const socket = dgram.createSocket('udp4');
            let done = false;
            const finish = (): void => {
                if (!done) {
                    done = true;
                    socket.close();
                    resolve([...found.values()].sort((a, b) => a.name.localeCompare(b.name)));
                }
            };
            socket.on('error', finish);
            socket.on('message', (message, sender) => {
                const answer = readAnswer(message);
                if (answer !== null && answer.id !== this.id && !found.has(answer.id)) {
                    found.set(answer.id, { name: answer.name, address: sender.address, port: answer.port });
                }
            });
            socket.bind(0, () => {
                socket.setBroadcast(true);
                for (const address of broadcastAddresses()) {
                    socket.send(QUESTION, DISCOVERY_PORT, address, () => undefined);
                }
                setTimeout(finish, SEARCH_MS);
            });
        });
    }
}

/** Checks an answer; null when it is not one of Backshade */
function readAnswer(message: Buffer): { id: string; name: string; port: number } | null {
    if (message.length > MAX_ANSWER_BYTES) {
        return null;
    }
    try {
        const data = JSON.parse(message.toString('utf8')) as { app?: unknown; id?: unknown; name?: unknown; port?: unknown };
        return data.app === 'Backshade' && typeof data.id === 'string' && typeof data.name === 'string'
            && typeof data.port === 'number' && Number.isInteger(data.port) && data.port > 0 && data.port < 65536
            ? { id: data.id, name: data.name.slice(0, INSTANCE_NAME_LENGTH), port: data.port }
            : null;
    } catch {
        return null;
    }
}
