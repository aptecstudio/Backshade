/**
 * Web server of the application, always on while it is open: it serves the
 * same interface to browsers on the local network, with a PIN login, and
 * the WebSocket of the engine protocol. It answers only to its own address
 * (Host) and to pages it served (Origin), so a web site open in the same
 * browser cannot drive it.
 */

import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import os from 'node:os';
import type { Duplex } from 'node:stream';
import { handleLocaleRequest } from '../protocol/locale-routes';
import { handleShowMediaRequest } from '../protocol/show-media-route';
import { SHOW_MEDIA_ROUTE } from '../../shared/audio/playback-protocol';
import type { RemoteAuth } from './remote-auth';
import type { Uploads } from './uploads';
import { SESSION_ENDED, type RemoteClients } from './remote-clients';
import { sendFetchResponse, sendJson, sendStatus, sendWebFile } from './web-files';
import { WebSocketConnection } from './websocket';

/** First port tried; the next ones when it is busy */
export const FIRST_PORT = 4747;
const PORTS = 10;
const MAX_BODY_BYTES = 1024;
const BODY_MS = 10 * 1000;
const UPLOAD_PATH = '/api/upload/';
const INDEX_PAGE = '/renderer/index.html';

export class WebServer {
    private readonly auth: RemoteAuth;
    private readonly clients: RemoteClients;
    private server: http.Server | null = null;
    /** Port listened, null until listening */
    port: number | null = null;

    private readonly uploads: Uploads;

    constructor(auth: RemoteAuth, clients: RemoteClients, uploads: Uploads) {
        this.auth = auth;
        this.clients = clients;
        this.uploads = uploads;
    }

    /** Listens on the first free port */
    start(): void {
        this.listen(FIRST_PORT);
    }

    stop(): void {
        this.clients.closeAll();
        this.server?.close();
        this.server?.closeAllConnections();
        this.server = null;
        this.port = null;
    }

    private listen(port: number): void {
        const server = http.createServer((request, response) => void this.handle(request, response).catch((error: unknown) => {
            console.warn('Web server request failed:', error);
            response.destroy();
        }));
        // Large files take longer than the default limit of a request; a silent upload is cut anyway
        server.requestTimeout = 0;
        server.on('upgrade', (request, socket: Duplex) => this.upgrade(request, socket));
        server.once('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE' && port < FIRST_PORT + PORTS - 1) {
                this.listen(port + 1);
            } else {
                console.error('Web server not started:', error.message);
            }
        });
        server.listen(port, () => {
            this.server = server;
            this.port = port;
        });
    }

    private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
        if (!isOwnHost(request)) {
            sendStatus(response, 403);
            return;
        }
        const url = new URL(request.url ?? '/', 'http://localhost');
        const token = sessionToken(request, this.port);
        if (url.pathname === '/api/login' || url.pathname === '/api/logout') {
            await this.account(request, response, url.pathname, token);
            return;
        }
        if (url.pathname.startsWith(UPLOAD_PATH)) {
            await this.upload(request, response, url.pathname.slice(UPLOAD_PATH.length), token);
            return;
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            sendStatus(response, 405);
            return;
        }
        if (url.pathname === '/api/status') {
            sendJson(response, 200, { app: 'Backshade', open: this.auth.open, session: this.auth.isValid(token) });
            return;
        }
        if (url.pathname === '/') {
            response.writeHead(302, { location: INDEX_PAGE });
            response.end();
            return;
        }
        const locale = handleLocaleRequest(url.pathname);
        if (locale !== null) {
            sendFetchResponse(request, response, await locale);
            return;
        }
        if (url.pathname.startsWith(SHOW_MEDIA_ROUTE)) {
            if (!this.auth.isValid(token)) {
                sendStatus(response, 401);
                return;
            }
            const range = request.headers.range;
            const media = handleShowMediaRequest(url.pathname, new Request(url, { headers: range === undefined ? {} : { range } }));
            if (media !== null) {
                sendFetchResponse(request, response, media);
            } else {
                sendStatus(response, 404);
            }
            return;
        }
        sendWebFile(request, response, url.pathname);
    }

    /** Login with the PIN, and logout */
    private async account(request: IncomingMessage, response: ServerResponse, pathname: string, token: string | null): Promise<void> {
        if (request.method !== 'POST' || !isOwnOrigin(request) || !String(request.headers['content-type']).startsWith('application/json')) {
            sendStatus(response, 403);
            return;
        }
        const cookie = cookieName(this.port);
        if (pathname === '/api/logout') {
            if (token !== null) {
                this.auth.logout(token);
            }
            sendJson(response, 200, { ok: true }, { 'set-cookie': `${cookie}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` });
            return;
        }
        const body = await readBody(request);
        let pin: unknown;
        try {
            pin = (JSON.parse(body ?? '') as { pin?: unknown }).pin;
        } catch {
            sendStatus(response, 400);
            return;
        }
        const result = await this.auth.login(request.socket.remoteAddress ?? '', pin);
        if ('error' in result) {
            sendJson(response, 401, { error: result.error });
        } else {
            sendJson(response, 200, { ok: true }, { 'set-cookie': `${cookie}=${result.token}; Path=/; HttpOnly; SameSite=Strict` });
        }
    }

    /** A file of a client, sent with the ticket the engine gave it */
    private async upload(request: IncomingMessage, response: ServerResponse, ticket: string, token: string | null): Promise<void> {
        if (request.method !== 'POST' || !isOwnOrigin(request) || request.headers['content-type'] !== 'application/octet-stream' || !this.auth.isValid(token)) {
            response.setHeader('connection', 'close');
            sendStatus(response, 403);
            return;
        }
        const name = await this.uploads.receive(ticket, request, () => this.auth.isValid(token));
        if (name === null) {
            response.setHeader('connection', 'close');
            sendStatus(response, 400);
        } else {
            sendJson(response, 200, { name });
        }
    }

    private upgrade(request: IncomingMessage, socket: Duplex): void {
        const token = sessionToken(request, this.port);
        const url = new URL(request.url ?? '/', 'http://localhost');
        if (url.pathname !== '/api/socket' || !isOwnHost(request) || !isOwnOrigin(request)) {
            socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            return;
        }
        const connection = WebSocketConnection.accept(request, socket);
        if (connection === null) {
            socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
            return;
        }
        // An ended session is told with a close code, which the client reads (an HTTP error is not readable)
        if (token === null || !this.auth.isValid(token)) {
            connection.close(SESSION_ENDED);
            return;
        }
        this.clients.add(connection, token);
    }
}

/** Host header naming this computer: an address, localhost or its name (against DNS rebinding) */
function isOwnHost(request: IncomingMessage): boolean {
    const host = (request.headers.host ?? '').toLowerCase().replace(/:\d+$/, '');
    const name = os.hostname().toLowerCase();
    return isIP(host.replace(/^\[|\]$/g, '')) !== 0 || host === 'localhost' || host === name || host === `${name}.local`;
}

/** The request comes from a page served by this server */
function isOwnOrigin(request: IncomingMessage): boolean {
    return request.headers.origin !== undefined && request.headers.origin.toLowerCase() === `http://${(request.headers.host ?? '').toLowerCase()}`;
}

/** Cookie of the session: named by port, cookies are shared between ports of a host */
function cookieName(port: number | null): string {
    return `backshade_${port ?? 0}`;
}

function sessionToken(request: IncomingMessage, port: number | null): string | null {
    const prefix = `${cookieName(port)}=`;
    const part = (request.headers.cookie ?? '').split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix));
    return part === undefined ? null : part.slice(prefix.length);
}

/** Small request body; null when too large */
function readBody(request: IncomingMessage): Promise<string | null> {
    return new Promise((resolve) => {
        const chunks: Buffer[] = [];
        let size = 0;
        request.setTimeout(BODY_MS, () => {
            resolve(null);
            request.destroy();
        });
        request.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                resolve(null);
                request.destroy();
            } else {
                chunks.push(chunk);
            }
        });
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        request.on('error', () => resolve(null));
    });
}
