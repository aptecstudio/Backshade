/**
 * Connection of a remote client: enter with the PIN, open the WebSocket and,
 * when it ends (Wi-Fi lost, application closed, operator changed), tell it
 * and reload the page as soon as the computer answers again, so every
 * section reads its state anew.
 */

import { Dialog, Label } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { useChannel } from '../transport/engine.js';
import { createWebSocketChannel } from '../transport/websocket-channel.js';
import { login, remoteStatus } from './login-screen.js';

// Close code of a session that ended (see the web server)
const SESSION_ENDED = 4001;
const RETRY_MS = 2000;

/** Opens the socket; null when it closes before opening */
function openSocket(): Promise<WebSocket | null> {
    return new Promise((resolve) => {
        const socket = new WebSocket(`ws://${window.location.host}/api/socket`);
        socket.addEventListener('open', () => resolve(socket), { once: true });
        socket.addEventListener('close', () => resolve(null), { once: true });
    });
}

/** Tells the connection ended and reloads when the computer answers again */
function reconnect(code: number): void {
    if (code === SESSION_ENDED) {
        window.location.reload();
        return;
    }
    const dialog = new Dialog({ title: t('remote.title') });
    dialog.append(new Label({ text: t('remote.connectionLost') }));
    dialog.open();
    const timer = window.setInterval(() => void remoteStatus().then(() => {
        window.clearInterval(timer);
        window.location.reload();
    }).catch(() => undefined), RETRY_MS);
}

/**
 * Connects the remote client and sets the channel of the engine; resolves
 * once connected.
 */
export async function connectRemote(): Promise<void> {
    for (;;) {
        let socket: WebSocket | null = null;
        try {
            if ((await remoteStatus()).session) {
                socket = await openSocket();
            }
        } catch {
            socket = null;
        }
        if (socket !== null) {
            // A session ended meanwhile closes the socket at once: wait a moment before trusting it
            const ended = await new Promise<boolean>((resolve) => {
                const done = window.setTimeout(() => resolve(false), 300);
                socket!.addEventListener('close', () => {
                    window.clearTimeout(done);
                    resolve(true);
                }, { once: true });
            });
            if (!ended) {
                useChannel(createWebSocketChannel(socket));
                socket.addEventListener('close', (event) => reconnect(event.code));
                return;
            }
        }
        await login();
    }
}
