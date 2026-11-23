/**
 * Scrittura di archivi ZIP senza dipendenze, con zlib di Node.
 * - I file di testo (JSON, SVG, testo) vengono compressi con deflate; gli
 *   altri, come audio, video e immagini, sono già compressi e vengono
 *   salvati senza ricomprimerli, leggendoli a blocchi.
 * - Zip64 per file, posizioni o archivi oltre i 4 GB.
 * - Ogni voce usa il descrittore dei dati (CRC e dimensioni dopo i dati),
 *   così i file grandi si scrivono in un solo passaggio.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/** File da mettere nell'archivio: da disco o da memoria */
export interface ZipSource {
    /** Percorso nell'archivio, con "/" come separatore */
    name: string;
    /** File su disco */
    file?: string;
    /** Contenuto in memoria, in alternativa a file */
    data?: Buffer;
}

/** Opzioni di scrittura */
export interface ZipWriteOptions {
    /** Usa sempre Zip64 (per le prove di compatibilità) */
    forceZip64?: boolean;
}

const MAX32 = 0xffffffff;
const MAX16 = 0xffff;
const COMPRESSED_EXTENSIONS = new Set(['.json', '.txt', '.svg', '.csv', '.xml', '.md']);
// Bit 3: descrittore dei dati; bit 11: nomi in UTF-8
const FLAGS = 0x0808;
const READ_CHUNK = 1024 * 1024;

interface CentralRecord {
    name: Buffer;
    method: number;
    time: number;
    date: number;
    crc: number;
    compressedSize: number;
    size: number;
    offset: number;
    zip64: boolean;
}

/**
 * Data e ora nel formato MS-DOS usato da ZIP.
 */
function dosDateTime(date: Date): { time: number; date: number } {
    const year = Math.max(1980, date.getFullYear());
    return {
        time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
        date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
}

/**
 * Campo extra Zip64 (id 0x0001) con i valori a 64 bit indicati.
 */
function zip64Extra(values: readonly number[]): Buffer {
    const extra = Buffer.alloc(4 + values.length * 8);
    extra.writeUInt16LE(0x0001, 0);
    extra.writeUInt16LE(values.length * 8, 2);
    values.forEach((value, index) => extra.writeBigUInt64LE(BigInt(value), 4 + index * 8));
    return extra;
}

/**
 * Scrive un archivio ZIP con i file indicati, nell'ordine dato.
 */
export async function writeZip(target: string, sources: readonly ZipSource[], options: ZipWriteOptions = {}): Promise<void> {
    const handle = await fs.promises.open(target, 'w');
    let offset = 0;
    const write = async (buffer: Buffer): Promise<void> => {
        await handle.write(buffer);
        offset += buffer.length;
    };
    const records: CentralRecord[] = [];

    try {
        for (const source of sources) {
            const name = Buffer.from(source.name, 'utf8');
            const stat = source.file === undefined ? null : await fs.promises.stat(source.file);
            const { time, date } = dosDateTime(stat?.mtime ?? new Date());
            const method = COMPRESSED_EXTENSIONS.has(path.extname(source.name).toLowerCase()) ? 8 : 0;
            const expectedSize = stat?.size ?? source.data?.length ?? 0;
            const zip64 = options.forceZip64 === true || expectedSize >= MAX32 || offset >= MAX32;
            const localOffset = offset;

            // Intestazione locale: CRC e dimensioni arrivano nel descrittore dopo i dati
            const extra = zip64 ? zip64Extra([0, 0]) : Buffer.alloc(0);
            const header = Buffer.alloc(30);
            header.writeUInt32LE(0x04034b50, 0);
            header.writeUInt16LE(zip64 ? 45 : 20, 4);
            header.writeUInt16LE(FLAGS, 6);
            header.writeUInt16LE(method, 8);
            header.writeUInt16LE(time, 10);
            header.writeUInt16LE(date, 12);
            if (zip64) {
                header.writeUInt32LE(MAX32, 18);
                header.writeUInt32LE(MAX32, 22);
            }
            header.writeUInt16LE(name.length, 26);
            header.writeUInt16LE(extra.length, 28);
            await write(Buffer.concat([header, name, extra]));

            let crc = 0;
            let size = 0;
            let compressedSize = 0;
            if (method === 8) {
                const raw = source.data ?? await fs.promises.readFile(source.file as string);
                const compressed = zlib.deflateRawSync(raw);
                crc = zlib.crc32(raw);
                size = raw.length;
                compressedSize = compressed.length;
                await write(compressed);
            } else if (source.data !== undefined) {
                crc = zlib.crc32(source.data);
                size = compressedSize = source.data.length;
                await write(source.data);
            } else {
                for await (const chunk of fs.createReadStream(source.file as string, { highWaterMark: READ_CHUNK })) {
                    const buffer = chunk as Buffer;
                    crc = zlib.crc32(buffer, crc);
                    size += buffer.length;
                    await write(buffer);
                }
                compressedSize = size;
            }

            // Descrittore dei dati, con dimensioni a 64 bit per Zip64
            const descriptor = Buffer.alloc(zip64 ? 24 : 16);
            descriptor.writeUInt32LE(0x08074b50, 0);
            descriptor.writeUInt32LE(crc >>> 0, 4);
            if (zip64) {
                descriptor.writeBigUInt64LE(BigInt(compressedSize), 8);
                descriptor.writeBigUInt64LE(BigInt(size), 16);
            } else {
                descriptor.writeUInt32LE(compressedSize, 8);
                descriptor.writeUInt32LE(size, 12);
            }
            await write(descriptor);

            records.push({ name, method, time, date, crc, compressedSize, size, offset: localOffset, zip64 });
        }

        const centralOffset = offset;
        for (const record of records) {
            await write(centralEntry(record, options.forceZip64 === true));
        }
        const centralSize = offset - centralOffset;
        await write(endOfCentralDirectory(records.length, centralSize, centralOffset, offset, options.forceZip64 === true));
    } finally {
        await handle.close();
    }
}

/**
 * Voce della directory centrale; i valori oltre i 32 bit vanno nel campo Zip64.
 */
function centralEntry(record: CentralRecord, force: boolean): Buffer {
    const sizeIn64 = force || record.size >= MAX32;
    const compressedIn64 = force || record.compressedSize >= MAX32;
    const offsetIn64 = force || record.offset >= MAX32;
    const values: number[] = [];
    if (sizeIn64) {
        values.push(record.size);
    }
    if (compressedIn64) {
        values.push(record.compressedSize);
    }
    if (offsetIn64) {
        values.push(record.offset);
    }
    const extra = values.length > 0 ? zip64Extra(values) : Buffer.alloc(0);
    const needs64 = record.zip64 || values.length > 0;

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(45, 4);
    entry.writeUInt16LE(needs64 ? 45 : 20, 6);
    entry.writeUInt16LE(FLAGS, 8);
    entry.writeUInt16LE(record.method, 10);
    entry.writeUInt16LE(record.time, 12);
    entry.writeUInt16LE(record.date, 14);
    entry.writeUInt32LE(record.crc >>> 0, 16);
    entry.writeUInt32LE(compressedIn64 ? MAX32 : record.compressedSize, 20);
    entry.writeUInt32LE(sizeIn64 ? MAX32 : record.size, 24);
    entry.writeUInt16LE(record.name.length, 28);
    entry.writeUInt16LE(extra.length, 30);
    entry.writeUInt32LE(offsetIn64 ? MAX32 : record.offset, 42);
    return Buffer.concat([entry, record.name, extra]);
}

/**
 * Fine della directory centrale, preceduta dai record Zip64 quando servono.
 */
function endOfCentralDirectory(count: number, size: number, offset: number, position: number, force: boolean): Buffer {
    const parts: Buffer[] = [];
    const zip64 = force || count >= MAX16 || size >= MAX32 || offset >= MAX32;

    if (zip64) {
        const record = Buffer.alloc(56);
        record.writeUInt32LE(0x06064b50, 0);
        record.writeBigUInt64LE(44n, 4);
        record.writeUInt16LE(45, 12);
        record.writeUInt16LE(45, 14);
        record.writeBigUInt64LE(BigInt(count), 24);
        record.writeBigUInt64LE(BigInt(count), 32);
        record.writeBigUInt64LE(BigInt(size), 40);
        record.writeBigUInt64LE(BigInt(offset), 48);

        const locator = Buffer.alloc(20);
        locator.writeUInt32LE(0x07064b50, 0);
        locator.writeBigUInt64LE(BigInt(position), 8);
        locator.writeUInt32LE(1, 16);
        parts.push(record, locator);
    }

    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(zip64 ? MAX16 : count, 8);
    end.writeUInt16LE(zip64 ? MAX16 : count, 10);
    end.writeUInt32LE(zip64 ? MAX32 : size, 12);
    end.writeUInt32LE(zip64 ? MAX32 : offset, 16);
    parts.push(end);
    return Buffer.concat(parts);
}
