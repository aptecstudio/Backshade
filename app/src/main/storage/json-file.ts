/**
 * Reading and writing of JSON files. Writing is atomic: the content
 * is written to a temporary file next to the final one and then
 * renamed, so an interruption never leaves a half-written file.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Reads a JSON file; returns undefined if the file does not exist.
 * @throws if the file exists but is not valid JSON
 */
export function readJsonFile(file: string): unknown {
    if (!fs.existsSync(file)) {
        return undefined;
    }
    return JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
}

/**
 * Writes a value as readable JSON, atomically.
 */
export function writeJsonFileAtomic(file: string, value: unknown): void {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, file);
}
