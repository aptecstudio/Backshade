/**
 * Reading and extraction of ZIP archives without dependencies, with Node zlib.
 * Supports the store and deflate methods and Zip64. Every extracted file is
 * checked (CRC and size) and no path can leave the
 * target folder.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';

/** Archive entry */
export interface ZipEntry {
    name: string;
    method: number;
    crc: number;
    compressedSize: number;
    size: number;
    offset: number;
    isDirectory: boolean;
}

/** Error of an invalid or unsupported archive */
export class ZipFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ZipFormatError';
    }
}

const MAX32 = 0xffffffff;
const MAX16 = 0xffff;
// End of central directory: 22 bytes plus a comment of at most 64 KB
const TAIL_SIZE = 22 + MAX16;

async function readAt(handle: fs.promises.FileHandle, position: number, length: number): Promise<Buffer> {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, position);
    if (bytesRead !== length) {
        throw new ZipFormatError('Truncated archive');
    }
    return buffer;
}

/**
 * Position, size and number of entries of the central directory.
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
        throw new ZipFormatError('End of central directory not found');
    }

    let count = tail.readUInt16LE(index + 10);
    let size = tail.readUInt32LE(index + 12);
    let offset = tail.readUInt32LE(index + 16);

    if (count === MAX16 || size === MAX32 || offset === MAX32) {
        const locatorPosition = tailStart + index - 20;
        const locator = await readAt(handle, locatorPosition, 20);
        if (locator.readUInt32LE(0) !== 0x07064b50) {
            throw new ZipFormatError('Zip64 locator not found');
        }
        const record = await readAt(handle, Number(locator.readBigUInt64LE(8)), 56);
        if (record.readUInt32LE(0) !== 0x06064b50) {
            throw new ZipFormatError('Invalid Zip64 record');
        }
        count = Number(record.readBigUInt64LE(32));
        size = Number(record.readBigUInt64LE(40));
        offset = Number(record.readBigUInt64LE(48));
    }
    return { offset, size, count };
}

/**
 * Reads the list of entries of an archive.
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
                throw new ZipFormatError('Invalid central directory entry');
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

            // Zip64 field: contains, in order, only the values equal to 0xFFFFFFFF
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
 * Converts the name of an entry into a path inside target.
 * @throws ZipFormatError for absolute paths or paths leaving target
 */
function safeTarget(target: string, name: string): string {
    if (name.includes('\\') || name.startsWith('/') || /^[a-zA-Z]:/.test(name)
        || name.split('/').includes('..')) {
        throw new ZipFormatError(`Path not allowed in the archive: ${name}`);
    }
    const resolved = path.resolve(target, ...name.split('/').filter((part) => part !== ''));
    if (resolved !== target && !resolved.startsWith(target + path.sep)) {
        throw new ZipFormatError(`Path not allowed in the archive: ${name}`);
    }
    return resolved;
}

/**
 * Extracts all entries into target, which must exist and be empty.
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
                throw new ZipFormatError(`Unsupported compression method: ${entry.method}`);
            }
            await fs.promises.mkdir(path.dirname(destination), { recursive: true });

            const local = await readAt(handle, entry.offset, 30);
            if (local.readUInt32LE(0) !== 0x04034b50) {
                throw new ZipFormatError(`Invalid local header: ${entry.name}`);
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
                // Empty file: no data to read
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
                throw new ZipFormatError(`Damaged data in the archive: ${entry.name}`);
            }
        }
    } finally {
        await handle.close();
    }
}
