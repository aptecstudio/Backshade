/**
 * UDP socket of Art-Net: sends DMX frames and ArtPoll requests and
 * receives the ArtPollReply of the nodes. It listens on the Art-Net port
 * when it is free; if another program uses it, sending still works but
 * the search of the nodes finds nothing.
 */

import dgram from 'node:dgram';
import { ARTNET_PORT, artPoll, parsePollReply, type ArtNetNode } from './artnet-packets';

export class ArtNetSocket {
    private socket: dgram.Socket | null = null;
    private listening = false;
    private readonly replies = new Set<(node: ArtNetNode) => void>();
    private lastError: string | null = null;

    /** The socket receives the answers of the nodes */
    get canDiscover(): boolean {
        return this.listening;
    }

    /** Last send error, or null */
    get error(): string | null {
        return this.lastError;
    }

    /**
     * Opens the socket; it is called again safely.
     */
    open(): void {
        if (this.socket !== null) {
            return;
        }
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        this.socket = socket;
        socket.on('message', (message) => {
            const node = parsePollReply(message);
            if (node !== null) {
                this.replies.forEach((listener) => listener(node));
            }
        });
        socket.on('error', (error) => {
            console.warn('Art-Net socket error', error.message);
            if (!this.listening) {
                // The port is in use: a socket on a free port can still send
                socket.close();
                this.socket = null;
                this.openSendOnly();
            }
        });
        socket.bind(ARTNET_PORT, () => {
            this.listening = true;
            socket.setBroadcast(true);
        });
    }

    /**
     * Sends a packet; errors are kept and shown in the output status, never thrown.
     */
    send(packet: Buffer, address: string): void {
        if (this.socket === null) {
            this.open();
        }
        this.socket?.send(packet, ARTNET_PORT, address, (error) => {
            this.lastError = error === null ? null : error.message;
        });
    }

    /**
     * Sends an ArtPoll to the broadcast addresses and collects the answers.
     */
    async discover(broadcasts: readonly string[], durationMs: number): Promise<ArtNetNode[]> {
        const nodes = new Map<string, ArtNetNode>();
        const listener = (node: ArtNetNode): void => {
            const key = `${node.address} ${node.shortName}`;
            nodes.set(key, node);
        };
        this.replies.add(listener);
        try {
            for (const address of broadcasts) {
                this.send(artPoll(), address);
            }
            await new Promise((resolve) => setTimeout(resolve, durationMs));
        } finally {
            this.replies.delete(listener);
        }
        return [...nodes.values()];
    }

    /**
     * Closes the socket.
     */
    close(): void {
        this.socket?.close();
        this.socket = null;
        this.listening = false;
    }

    private openSendOnly(): void {
        const socket = dgram.createSocket('udp4');
        this.socket = socket;
        socket.on('error', (error) => {
            this.lastError = error.message;
        });
        socket.bind(0, () => socket.setBroadcast(true));
    }
}
