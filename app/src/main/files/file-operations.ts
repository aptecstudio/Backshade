/**
 * Changes of the file manager: new folder, rename, copy, move, move to the
 * trash and delete. The roots themselves, the application data and the open
 * show (except its media) are protected.
 */

import fs from 'node:fs';
import path from 'node:path';
import { app, shell } from 'electron';
import { uniquePath } from '../storage/file-names';
import { EngineError } from '../transport/engine-error';
import { fileRoots, isInside } from './file-roots';

// Characters not allowed in a file name on at least one of the supported systems
const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001F]/;

/** Name typed for a file or folder, checked */
function checkedName(name: string): string {
    const result = name.trim();
    if (result === '' || result === '.' || result === '..' || result.length > 255 || FORBIDDEN.test(result)) {
        throw new EngineError('invalid-name', `Invalid file name: ${name}`);
    }
    return result;
}

/**
 * Refuses a change of a protected place.
 * @param showFolder - Folder of the open show, null without a show
 */
export function requireChangeable(target: string, showFolder: string | null): void {
    const isRoot = fileRoots(showFolder).some((root) => path.resolve(root.path) === target);
    const userData = app.getPath('userData');
    const inShow = showFolder !== null && isInside(target, showFolder) && !(isInside(target, path.join(showFolder, 'media')) && target !== path.join(showFolder, 'media'));
    const holdsShow = showFolder !== null && target !== showFolder && isInside(showFolder, target);
    if (isRoot || holdsShow || inShow || isInside(target, userData) || isInside(userData, target)) {
        throw new EngineError('file-protected', `Protected: ${target}`);
    }
}

/**
 * Refuses to write inside a protected place (new folders, copies, exports):
 * the open show accepts files only in its media folder.
 */
export function requireWritable(folder: string, showFolder: string | null): void {
    const inShow = showFolder !== null && isInside(folder, showFolder) && !isInside(folder, path.join(showFolder, 'media'));
    if (inShow || isInside(folder, app.getPath('userData'))) {
        throw new EngineError('file-protected', `Protected: ${folder}`);
    }
}

function requireExisting(target: string): void {
    if (!fs.existsSync(target)) {
        throw new EngineError('file-not-found', `Not found: ${target}`);
    }
}

function requireFree(target: string): void {
    if (fs.existsSync(target)) {
        throw new EngineError('file-exists', `Already exists: ${target}`);
    }
}

/** Free destination for a copy or a move: a number is added to a name already used */
function destination(source: string, folder: string): string {
    const extension = path.extname(source);
    return uniquePath(folder, path.basename(source, extension), extension);
}

function requireNotIntoItself(source: string, folder: string): void {
    if (isInside(folder, source)) {
        throw new EngineError('copy-into-itself', `A folder cannot go into itself: ${source}`);
    }
}

/** Creates a folder and returns its path */
export function createFolder(parent: string, name: string): string {
    const target = path.join(parent, checkedName(name));
    requireFree(target);
    fs.mkdirSync(target);
    return target;
}

/** Renames a file or folder and returns its new path */
export function renameEntry(target: string, name: string): string {
    requireExisting(target);
    const renamed = path.join(path.dirname(target), checkedName(name));
    // A change of letter case only is allowed on case-insensitive file systems
    if (renamed.toLowerCase() !== target.toLowerCase()) {
        requireFree(renamed);
    }
    fs.renameSync(target, renamed);
    return renamed;
}

/** Copies files and folders into a folder */
export async function copyEntries(sources: readonly string[], folder: string): Promise<void> {
    for (const source of sources) {
        requireExisting(source);
        requireNotIntoItself(source, folder);
        await fs.promises.cp(source, destination(source, folder), { recursive: true, errorOnExist: true, force: false });
    }
}

/** Moves files and folders into a folder, also across drives */
export async function moveEntries(sources: readonly string[], folder: string): Promise<void> {
    for (const source of sources) {
        requireExisting(source);
        requireNotIntoItself(source, folder);
        if (path.dirname(source) === folder) {
            continue;
        }
        const target = destination(source, folder);
        try {
            await fs.promises.rename(source, target);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EXDEV') {
                throw error;
            }
            // Another drive: copied, then removed only when the copy is complete
            await fs.promises.cp(source, target, { recursive: true, errorOnExist: true, force: false });
            await fs.promises.rm(source, { recursive: true, force: true });
        }
    }
}

/** Moves files and folders to the trash of the system */
export async function trashEntries(targets: readonly string[]): Promise<void> {
    for (const target of targets) {
        requireExisting(target);
        try {
            await shell.trashItem(target);
        } catch {
            throw new EngineError('trash-failed', `Cannot move to the trash: ${target}`);
        }
    }
}

/** Deletes files and folders for good */
export async function deleteEntries(targets: readonly string[]): Promise<void> {
    for (const target of targets) {
        requireExisting(target);
        await fs.promises.rm(target, { recursive: true, force: true });
    }
}
