/**
 * Answers of the web server: the interface files, the language packs and
 * (with a session) the media of the open show, with the same code that
 * serves them to the windows.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { resolveWebFile } from '../protocol/app-protocol';

const TYPES: Readonly<Record<string, string>> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
};

/** Headers of every answer */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer'
};

export function sendStatus(response: ServerResponse, status: number): void {
    response.writeHead(status, SECURITY_HEADERS);
    response.end();
}

export function sendJson(response: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}): void {
    response.writeHead(status, { ...SECURITY_HEADERS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
    response.end(JSON.stringify(value));
}

/** Sends a file of the interface */
export function sendWebFile(request: IncomingMessage, response: ServerResponse, pathname: string): void {
    let file: string | null = null;
    try {
        file = resolveWebFile(pathname);
    } catch {
        file = null;
    }
    if (file === null || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        sendStatus(response, 404);
        return;
    }
    response.writeHead(200, {
        ...SECURITY_HEADERS,
        'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'content-length': String(fs.statSync(file).size),
        'cache-control': 'no-cache'
    });
    if (request.method === 'HEAD') {
        response.end();
        return;
    }
    fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
}

/** Sends the answer of a route of the app protocol (languages, show media) */
export function sendFetchResponse(request: IncomingMessage, response: ServerResponse, answer: Response): void {
    response.writeHead(answer.status, { ...SECURITY_HEADERS, ...Object.fromEntries(answer.headers) });
    if (answer.body === null || request.method === 'HEAD') {
        void answer.body?.cancel();
        response.end();
        return;
    }
    const body = Readable.fromWeb(answer.body as unknown as NodeReadableStream);
    body.on('error', () => response.destroy());
    response.on('close', () => body.destroy());
    body.pipe(response);
}
