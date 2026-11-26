/**
 * Address of the media of the open show, for the playback window:
 * /show-media/<path relative to media/>. Byte ranges are answered, so audio
 * and video can start from any time. Nothing is served without an open show.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { SHOW_MEDIA_ROUTE } from '../../shared/audio/playback-protocol';
import { resolveMediaPath } from '../shows/media-library';

const TYPES: Readonly<Record<string, string>> = {
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.aif': 'audio/aiff',
    '.aiff': 'audio/aiff',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
};

// Folder of the open show, set by the engine
let showFolder: string | null = null;

/**
 * Sets the folder of the open show, or null when no show is open.
 */
export function setShowMediaFolder(folder: string | null): void {
    showFolder = folder;
}

/**
 * Answers the requests for the show media; null if the path is not about them.
 */
export function handleShowMediaRequest(pathname: string, request: Request): Response | null {
    if (!pathname.startsWith(SHOW_MEDIA_ROUTE)) {
        return null;
    }
    if (showFolder === null) {
        return new Response(null, { status: 404 });
    }
    let file: string;
    try {
        file = resolveMediaPath(showFolder, decodeURIComponent(pathname.slice(SHOW_MEDIA_ROUTE.length)));
    } catch {
        return new Response(null, { status: 404 });
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return new Response(null, { status: 404 });
    }
    const size = fs.statSync(file).size;
    const headers: Record<string, string> = {
        'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'accept-ranges': 'bytes',
        'cache-control': 'no-store'
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
    if (range === null) {
        headers['content-length'] = String(size);
        return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, { status: 200, headers });
    }
    const start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
    const end = range[1] !== '' && range[2] !== '' ? Math.min(size - 1, Number(range[2])) : size - 1;
    if (start > end || start >= size) {
        return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
    }
    headers['content-length'] = String(end - start + 1);
    headers['content-range'] = `bytes ${start}-${end}/${size}`;
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream, { status: 206, headers });
}
