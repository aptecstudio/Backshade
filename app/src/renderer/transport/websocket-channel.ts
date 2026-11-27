/**
 * WebSocket channel of a remote client, with the same protocol as IPC. The
 * socket is already open when the channel is created; once it closes every
 * waiting request fails with the code "disconnected".
 */

import type { EventMessage, RequestMessage, ResponseMessage } from '../../shared/transport/protocol.js';
import type { TransportChannel } from './transport-channel.js';

export function createWebSocketChannel(socket: WebSocket): TransportChannel {
    const waiting = new Map<number, (response: ResponseMessage) => void>();
    const listeners = new Set<(message: EventMessage) => void>();
    const lost = (id: number): ResponseMessage => ({ type: 'response', id, ok: false, error: { code: 'disconnected', message: 'Connection lost' } });

    socket.addEventListener('message', (event) => {
        const message = JSON.parse(String(event.data)) as ResponseMessage | EventMessage;
        if (message.type === 'event') {
            listeners.forEach((listener) => listener(message));
            return;
        }
        waiting.get(message.id)?.(message);
        waiting.delete(message.id);
    });
    socket.addEventListener('close', () => {
        waiting.forEach((resolve, id) => resolve(lost(id)));
        waiting.clear();
    });

    return {
        request: (message: RequestMessage) => new Promise((resolve) => {
            if (socket.readyState !== WebSocket.OPEN) {
                resolve(lost(message.id));
                return;
            }
            waiting.set(message.id, resolve);
            socket.send(JSON.stringify(message));
        }),
        onEvent: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        }
    };
}
