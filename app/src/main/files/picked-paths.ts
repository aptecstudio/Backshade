/**
 * Paths chosen in the file manager and sent to the other services (imports
 * and exports): checked against the roots, existing for what is read, in a
 * writable place and with the expected extension for what is written.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import { requireWritable } from './file-operations';
import { allowedPath } from './file-roots';

/** An existing file to read */
export function pickedFile(target: string, session: ShowSession): string {
    const file = allowedPath(target, session.summary()?.folder ?? null);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        throw new EngineError('file-not-found', `File not found: ${target}`);
    }
    return file;
}

/**
 * A file to write.
 * @param extension - Extension added when the name does not have it, without the dot
 */
export function pickedTarget(target: string, extension: string, session: ShowSession): string {
    const showFolder = session.summary()?.folder ?? null;
    const named = target.toLowerCase().endsWith(`.${extension}`) ? target : `${target}.${extension}`;
    const file = allowedPath(named, showFolder);
    requireWritable(path.dirname(file), showFolder);
    return file;
}
