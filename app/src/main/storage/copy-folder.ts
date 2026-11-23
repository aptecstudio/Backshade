/**
 * Copy of a folder excluding some top-level entries
 * (for example recovery copies and history when copying a show).
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Copies source to target, which must not exist.
 * @param exclude - Names of top-level files or folders not to copy
 */
export function copyFolder(source: string, target: string, exclude: readonly string[] = []): void {
    fs.cpSync(source, target, {
        recursive: true,
        errorOnExist: true,
        force: false,
        filter: (file) => {
            const relative = path.relative(source, file);
            const topLevel = relative.split(path.sep)[0];
            return relative === '' || !exclude.includes(topLevel);
        }
    });
}
