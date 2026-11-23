/**
 * File and folder names derived from names chosen by the user.
 */

import fs from 'node:fs';
import path from 'node:path';
import { EngineError } from '../transport/engine-error';

// Characters not allowed in file names on at least one of the supported systems
const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001F]/g;
const MAX_LENGTH = 100;

/**
 * Cleans a name chosen by the user so that it can be used as a folder name.
 * @throws EngineError "invalid-name" if the name is empty
 */
export function toFileName(name: string): string {
    const cleaned = name.replace(FORBIDDEN, '-').trim().replace(/[. ]+$/, '').slice(0, MAX_LENGTH).trim();
    if (cleaned === '') {
        throw new EngineError('invalid-name', 'Empty or invalid name');
    }
    return cleaned;
}

/**
 * Returns a free path in the given folder, adding a
 * number to the name if it already exists (for example "Name 2.backshade").
 */
export function uniquePath(folder: string, baseName: string, extension: string): string {
    let candidate = path.join(folder, `${baseName}${extension}`);
    for (let index = 2; fs.existsSync(candidate); index++) {
        candidate = path.join(folder, `${baseName} ${index}${extension}`);
    }
    return candidate;
}
