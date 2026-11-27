/**
 * Files sent by remote clients. The engine, after checking the permissions,
 * gives a ticket for one file in one folder; the file then arrives as the
 * body of an HTTP request and is written to a temporary file, which takes
 * its name (with a number when already used) only when it is complete.
 */

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { uniquePath } from '../storage/file-names';
import { EngineError } from '../transport/engine-error';

/** Largest file accepted */
const MAX_BYTES = 16 * 1024 * 1024 * 1024;
const MAX_TICKETS = 64;
const MAX_RUNNING = 4;
// Time to start sending after the ticket, and longest silence while sending
const TICKET_MS = 60 * 1000;
const IDLE_MS = 60 * 1000;

interface Ticket {
    folder: string;
    name: string;
    size: number;
    expires: number;
}

/** File name sent by a device: no folders, no characters refused by some system */
function receivedName(name: string): string {
    const cleaned = (name.split(/[\\/]/).pop() ?? '').replace(/[<>:"|?*\u0000-\u001F]/g, '-').trim().replace(/^\.+/, '');
    const extension = path.extname(cleaned).slice(0, 16);
    const base = cleaned.slice(0, cleaned.length - extension.length).slice(0, 200).trim();
    if (base === '' || extension === '') {
        throw new EngineError('invalid-name', `Invalid file name: ${name}`);
    }
    return `${base}${extension}`;
}

export class Uploads {
    private readonly tickets = new Map<string, Ticket>();
    private running = 0;
    private readonly received: (file: string) => void;

    /**
     * @param received - Told the path of every complete file
     */
    constructor(received: (file: string) => void) {
        this.received = received;
    }

    /**
     * Ticket to send one file.
     * @param folder - Folder where it goes, already checked
     * @param accepts - Tells whether the kind of file may be sent there
     */
    begin(folder: string, name: string, size: number, accepts: (name: string) => boolean): { ticket: string } {
        const file = receivedName(name);
        if (!accepts(file)) {
            throw new EngineError('unsupported-file', `Kind of file not accepted: ${file}`);
        }
        if (!Number.isInteger(size) || size < 0 || size > MAX_BYTES) {
            throw new EngineError('file-too-large', `File too large: ${file}`);
        }
        fs.mkdirSync(folder, { recursive: true });
        const space = fs.statfsSync(folder);
        if (size >= space.bavail * space.bsize) {
            throw new EngineError('disk-full', 'Not enough space on the disk');
        }
        const now = Date.now();
        for (const [ticket, item] of this.tickets) {
            if (item.expires < now) {
                this.tickets.delete(ticket);
            }
        }
        if (this.tickets.size >= MAX_TICKETS) {
            throw new EngineError('upload-busy', 'Too many files waiting');
        }
        const ticket = randomBytes(24).toString('hex');
        this.tickets.set(ticket, { folder, name: file, size, expires: now + TICKET_MS });
        return { ticket };
    }

    /**
     * Writes the file of a ticket from a request; the ticket is used once.
     * @param stillAllowed - Checked when the file is complete: the sender may have been disconnected meanwhile
     * @returns the name the file took, or null when it was refused or incomplete
     */
    async receive(ticket: string, request: IncomingMessage, stillAllowed: () => boolean): Promise<string | null> {
        const item = this.tickets.get(ticket);
        this.tickets.delete(ticket);
        if (item === undefined || item.expires < Date.now() || this.running >= MAX_RUNNING
            || Number(request.headers['content-length']) !== item.size) {
            return null;
        }
        // Hidden and without a known extension: never listed while incomplete
        const partial = path.join(item.folder, `.${ticket}.part`);
        this.running += 1;
        request.socket.setTimeout(IDLE_MS, () => request.destroy());
        try {
            await pipeline(request, fs.createWriteStream(partial, { flags: 'wx' }));
            if (fs.statSync(partial).size !== item.size || !stillAllowed()) {
                return null;
            }
            const extension = path.extname(item.name);
            const target = uniquePath(item.folder, path.basename(item.name, extension), extension);
            fs.renameSync(partial, target);
            this.received(target);
            return path.basename(target);
        } catch (error) {
            console.warn('File not received:', error instanceof Error ? error.message : error);
            return null;
        } finally {
            this.running -= 1;
            fs.rmSync(partial, { force: true });
        }
    }
}
