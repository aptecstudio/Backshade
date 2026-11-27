/**
 * Content of a folder for the file manager: folders first, then files, by
 * name; hidden entries (names starting with a dot) are left out.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileKindOf, type FileEntry, type FileRoot, type FolderContent } from '../../shared/files/file-entry';
import { EngineError } from '../transport/engine-error';

/** Entry of a path; null when it cannot be read */
function entryOf(folder: string, name: string): FileEntry | null {
    const target = path.join(folder, name);
    try {
        const stats = fs.statSync(target);
        const directory = stats.isDirectory();
        return { name, path: target, kind: fileKindOf(name, directory), size: directory ? 0 : stats.size, modifiedAt: stats.mtime.toISOString() };
    } catch {
        return null;
    }
}

/**
 * Content of an allowed folder.
 * @param roots - Roots of the file manager, where going up stops
 */
export function listFolder(folder: string, roots: readonly FileRoot[]): FolderContent {
    let names: string[];
    try {
        names = fs.readdirSync(folder);
    } catch {
        throw new EngineError('file-not-found', `Folder not readable: ${folder}`);
    }
    const entries = names
        .filter((name) => !name.startsWith('.'))
        .map((name) => entryOf(folder, name))
        .filter((entry): entry is FileEntry => entry !== null)
        .sort((a, b) => Number(isFolder(b)) - Number(isFolder(a)) || a.name.localeCompare(b.name, undefined, { numeric: true }));
    const atRoot = roots.some((root) => path.resolve(root.path) === folder);
    return { path: folder, parent: atRoot ? null : path.dirname(folder), entries };
}

/** Entry that opens as a folder */
export function isFolder(entry: Pick<FileEntry, 'kind'>): boolean {
    return entry.kind === 'folder' || entry.kind === 'show';
}
