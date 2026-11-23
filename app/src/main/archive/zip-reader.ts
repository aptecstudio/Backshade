/**
 * Lettura ed estrazione di archivi ZIP senza dipendenze, con zlib di Node.
 * Supporta i metodi store e deflate e Zip64. Ogni file estratto viene
 * verificato (CRC e dimensione) e nessun percorso può uscire dalla
 * cartella di destinazione.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';

/** Voce dell'archivio */
export interface ZipEntry {
    name: string;
    method: number;
    crc: number;
    compressedSize: number;
    size: number;
    offset: number;
    isDirectory: boolean;
}

/** Errore di un archivio non valido o non supportato */
export class ZipFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ZipFormatError';
    }
}

const MAX32 = 0xffffffff;
const MAX16 = 0xffff;
// Fine della directory centrale: 22 byte più un commento di al massimo 64 KB
const TAIL_SIZE = 22 + MAX16;

async function readAt(handle: fs.promises.FileHandle, position: number, length: number): Promise<Buffer> {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, position);
    if (bytesRead !== length) {
        throw new ZipFormatError('Archivio troncato');
    }
    return buffer;
}

/**
 * Posizione, dimensione e numero di voci della directory centrale.
 */
async function findCentralDirectory(handle: fs.promises.FileHandle, fileSize: number): Promise<{ offset: number; size: number; count: number }> {
    const tailLength = Math.min(fileSize, TAIL_SIZE);
    const tailStart = fileSize - tailLength;
    const tail = await readAt(handle, tailStart, tailLength);

    let index = tail.length - 22;
    while (index >= 0 && tail.readUInt32LE(index) !== 0x06054b50) {
        index--;
    }
    if (index < 0) {
        throw new ZipFormatError('Fine della directory centrale non trovata');
    }

    let count = tail.readUInt16LE(index + 10);
    let size = tail.readUInt32LE(index + 12);
    let offset = tail.readUInt32LE(index + 16);

    if (count === MAX16 || size === MAX32 || offset === MAX32) {
        const locatorPosition = tailStart + index - 20;
        const locator = await readAt(handle, locatorPosition, 20);
        if (locator.readUInt32LE(0) !== 0x07064b50) {
            throw new ZipFormatError('Localizzatore Zip64 non trovato');
        }
        const record = await readAt(handle, Number(locator.readBigUInt64LE(8)), 56);
        if (record.readUInt32LE(0) !== 0x06064b50) {
            throw new ZipFormatError('Record Zip64 non valido');
        }
        count = Number(record.readBigUInt64LE(32));
        size = Number(record.readBigUInt64LE(40));
        offset = Number(record.readBigUInt64LE(48));
    }
    return { offset, size, count };
}

/**
 * Legge l'elenco delle voci di un archivio.
 */
export async function readZipEntries(file: string): Promise<ZipEntry[]> {
    const handle = await fs.promises.open(file, 'r');
    try {
        const { size: fileSize } = await handle.stat();
        const central = await findCentralDirectory(handle, fileSize);
        const directory = await readAt(handle, central.offset, central.size);
        const entries: ZipEntry[] = [];

        let position = 0;
        for (let index = 0; index < central.count; index++) {
            if (directory.readUInt32LE(position) !== 0x02014b50) {
                throw new ZipFormatError('Voce della directory centrale non valida');
            }
            const method = directory.readUInt16LE(position + 10);
            const crc = directory.readUInt32LE(position + 16);
            let compressedSize = directory.readUInt32LE(position + 20);
            let size = directory.readUInt32LE(position + 24);
            const nameLength = directory.readUInt16LE(position + 28);
            const extraLength = directory.readUInt16LE(position + 30);
            const commentLength = directory.readUInt16LE(position + 32);
            let offset = directory.readUInt32LE(position + 42);
            const name = directory.toString('utf8', position + 46, position + 46 + nameLength);

            // Campo Zip64: contiene, in ordine, solo i valori che valgono 0xFFFFFFFF
            let extra = position + 46 + nameLength;
            const extraEnd = extra + extraLength;
            while (extra + 4 <= extraEnd) {
                const id = directory.readUInt16LE(extra);
                const length = directory.readUInt16LE(extra + 2);
                if (id === 0x0001) {
                    let field = extra + 4;
                    if (size === MAX32) {
                        size = Number(directory.readBigUInt64LE(field));
                        field += 8;
                    }
                    if (compressedSize === MAX32) {
                        compressedSize = Number(directory.readBigUInt64LE(field));
                        field += 8;
                    }
                    if (offset === MAX32) {
                        offset = Number(directory.readBigUInt64LE(field));
                    }
                }
                extra += 4 + length;
            }

            entries.push({ name, method, crc, compressedSize, size, offset, isDirectory: name.endsWith('/') });
            position = extraEnd + commentLength;
        }
        return entries;
    } finally {
        await handle.close();
    }
}

/**
 * Converte il nome di una voce in un percorso dentro target.
 * @throws ZipFormatError per percorsi assoluti o che escono da target
 */
function safeTarget(target: string, name: string): string {
    if (name.includes('\\') || name.startsWith('/') || /^[a-zA-Z]:/.test(name)
        || name.split('/').includes('..')) {
        throw new ZipFormatError(`Percorso non ammesso nell'archivio: ${name}`);
    }
    const resolved = path.resolve(target, ...name.split('/').filter((part) => part !== ''));
    if (resolved !== target && !resolved.startsWith(target + path.sep)) {
        throw new ZipFormatError(`Percorso non ammesso nell'archivio: ${name}`);
    }
    return resolved;
}

/**
 * Estrae tutte le voci in target, che deve esistere ed essere vuota.
 */
export async function extractZip(file: string, target: string): Promise<void> {
    const root = path.resolve(target);
    const entries = await readZipEntries(file);
    const handle = await fs.promises.open(file, 'r');

    try {
        for (const entry of entries) {
            const destination = safeTarget(root, entry.name);
            if (entry.isDirectory) {
                await fs.promises.mkdir(destination, { recursive: true });
                continue;
            }
            if (entry.method !== 0 && entry.method !== 8) {
                throw new ZipFormatError(`Metodo di compressione non supportato: ${entry.method}`);
            }
            await fs.promises.mkdir(path.dirname(destination), { recursive: true });

            const local = await readAt(handle, entry.offset, 30);
            if (local.readUInt32LE(0) !== 0x04034b50) {
                throw new ZipFormatError(`Intestazione locale non valida: ${entry.name}`);
            }
            const dataStart = entry.offset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);

            let crc = 0;
            let size = 0;
            const check = new Transform({
                transform(chunk: Buffer, _encoding, callback): void {
                    crc = zlib.crc32(chunk, crc);
                    size += chunk.length;
                    callback(null, chunk);
                }
            });
            if (entry.compressedSize === 0) {
                // File vuoto: niente dati da leggere
                await fs.promises.writeFile(destination, '', { flag: 'wx' });
            } else {
                const output = fs.createWriteStream(destination, { flags: 'wx' });
                const input = fs.createReadStream(file, { start: dataStart, end: dataStart + entry.compressedSize - 1 });
                if (entry.method === 8) {
                    await pipeline(input, zlib.createInflateRaw(), check, output);
                } else {
                    await pipeline(input, check, output);
                }
            }

            if (size !== entry.size || (crc >>> 0) !== (entry.crc >>> 0)) {
                throw new ZipFormatError(`Dati danneggiati nell'archivio: ${entry.name}`);
            }
        }
    } finally {
        await handle.close();
    }
}
