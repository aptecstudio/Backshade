/**
 * Server side of a WebSocket connection: the handshake, text messages,
 * ping and pong to detect a lost client quickly, and the closing.
 */

import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { encodeFrame, FrameReader, OPCODES, WebSocketError } from './websocket-frames';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
// A client that does not answer a ping within this time is considered lost
const PING_MS = 4000;
const LOST_MS = 10000;
// Bytes waiting to be sent after which a client that reads too slowly is dropped
const MAX_PENDING_BYTES = 16 * 1024 * 1024;

export class WebSocketConnection {
    private readonly socket: Duplex;
    private readonly reader = new FrameReader();
    private readonly ping: NodeJS.Timeout;
    private lastSeen = Date.now();
    private closed = false;
    private onText: (text: string) => void = () => undefined;
    private readonly closeListeners: Array<() => void> = [];

    /**
     * Answers the upgrade request and returns the connection; null when the
     * request is not a valid WebSocket upgrade.
     */
    static accept(request: IncomingMessage, socket: Duplex): WebSocketConnection | null {
        const key = request.headers['sec-websocket-key'];
        if (typeof key !== 'string' || request.headers['sec-websocket-version'] !== '13'
            || String(request.headers.upgrade).toLowerCase() !== 'websocket') {
            return null;
        }
        const accept = createHash('sha1').update(key + GUID).digest('base64');
        socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
        return new WebSocketConnection(socket);
    }

    private constructor(socket: Duplex) {
        this.socket = socket;
        socket.on('data', (chunk: Buffer) => this.receive(chunk));
        socket.on('error', () => this.destroy());
        socket.on('close', () => this.destroy());
        this.ping = setInterval(() => {
            if (Date.now() - this.lastSeen > LOST_MS) {
                this.destroy();
            } else {
                this.write(OPCODES.ping, Buffer.alloc(0));
            }
        }, PING_MS);
        this.ping.unref();
    }

    /** Listener of the text messages of the client */
    onMessage(listener: (text: string) => void): void {
        this.onText = listener;
    }

    /** Called once when the connection ends, however it ends */
    onClose(listener: () => void): void {
        this.closeListeners.push(listener);
    }

    send(text: string): void {
        this.write(OPCODES.text, Buffer.from(text, 'utf8'));
    }

    /** Closes with a code, for example 4001 when the session is no longer valid */
    close(code = 1000): void {
        const payload = Buffer.alloc(2);
        payload.writeUInt16BE(code);
        this.write(OPCODES.close, payload);
        this.destroy();
    }

    private write(opcode: number, payload: Buffer): void {
        if (this.closed) {
            return;
        }
        if (this.socket.writableLength > MAX_PENDING_BYTES) {
            this.destroy();
            return;
        }
        this.socket.write(encodeFrame(opcode, payload));
    }

    private receive(chunk: Buffer): void {
        if (this.closed) {
            return;
        }
        this.lastSeen = Date.now();
        try {
            for (const frame of this.reader.push(chunk)) {
                if (frame.opcode === OPCODES.text) {
                    this.onText(frame.payload.toString('utf8'));
                } else if (frame.opcode === OPCODES.ping) {
                    this.write(OPCODES.pong, frame.payload);
                } else if (frame.opcode === OPCODES.close) {
                    this.close();
                } else if (frame.opcode !== OPCODES.pong) {
                    throw new WebSocketError(1003, 'Only text messages are accepted');
                }
            }
        } catch (error) {
            this.close(error instanceof WebSocketError ? error.code : 1011);
        }
    }

    private destroy(): void {
        if (this.closed) {
            return;
        }
        this.closed = true;
        clearInterval(this.ping);
        this.socket.end();
        this.closeListeners.splice(0).forEach((listener) => listener());
    }
}
