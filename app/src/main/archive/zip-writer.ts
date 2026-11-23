/**
 * Writing of ZIP archives without dependencies, with Node zlib.
 * - Text files (JSON, SVG, text) are compressed with deflate; the
 *   others, such as audio, video and images, are already compressed and are
 *   stored without recompressing them, reading them in chunks.
 * - Zip64 for files, offsets or archives over 4 GB.
 * - Every entry uses the data descriptor (CRC and sizes after the data),
 *   so large files are written in a single pass.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/** File to put in the archive: from disk or from memory */
export interface ZipSource {
    /** Path in the archive, with "/" as separator */
    name: string;
    /** File on disk */
    file?: string;
    /** Content in memory, as an alternative to file */
    data?: Buffer;
}

/** Write options */
export interface ZipWriteOptions {
    /** Always use Zip64 (for compatibility tests) */
    forceZip64?: boolean;
}

const MAX32 = 0xffffffff;
const MAX16 = 0xffff;
const COMPRESSED_EXTENSIONS = new Set(['.json', '.txt', '.svg', '.csv', '.xml', '.md']);
// Bit 3: data descriptor; bit 11: UTF-8 names
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
 * Date and time in the MS-DOS format used by ZIP.
 */
function dosDateTime(date: Date): { time: number; date: number } {
    const year = Math.max(1980, date.getFullYear());
    return {
        time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
        date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
}

/**
 * Zip64 extra field (id 0x0001) with the given 64-bit values.
 */
function zip64Extra(values: readonly number[]): Buffer {
    const extra = Buffer.alloc(4 + values.length * 8);
    extra.writeUInt16LE(0x0001, 0);
    extra.writeUInt16LE(values.length * 8, 2);
    values.forEach((value, index) => extra.writeBigUInt64LE(BigInt(value), 4 + index * 8));
    return extra;
}

/**
 * Writes a ZIP archive with the given files, in the given order.
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

            // Local header: CRC and sizes come in the descriptor after the data
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

            // Data descriptor, with 64-bit sizes for Zip64
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
 * Central directory entry; values over 32 bits go in the Zip64 field.
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
 * End of central directory, preceded by the Zip64 records when needed.
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
