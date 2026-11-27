/**
 * Places the internal file manager can reach: the home folder, the external
 * drives and the folder of the open show. Every path from the interface is
 * checked against them, following symbolic links, so a link never leads
 * outside.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FileRoot } from '../../shared/files/file-entry';
import { EngineError } from '../transport/engine-error';

function hasContent(folder: string): boolean {
    try {
        return fs.readdirSync(folder).length > 0;
    } catch {
        return false;
    }
}

/** Folders of a parent that are mounted drives */
function drivesIn(parent: string): FileRoot[] {
    try {
        return fs.readdirSync(parent, { withFileTypes: true })
            // Empty or unreadable mount points are not drives to browse
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && hasContent(path.join(parent, entry.name)))
            .map((entry) => ({ path: path.join(parent, entry.name), name: entry.name, kind: 'drive' as const }));
    } catch {
        return [];
    }
}

/** External drives of this computer */
function externalDrives(): FileRoot[] {
    if (process.platform === 'win32') {
        const system = (process.env.SystemDrive ?? 'C:').toUpperCase();
        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
            .map((letter) => `${letter}:`)
            .filter((drive) => drive !== system && fs.existsSync(`${drive}\\`))
            .map((drive) => ({ path: `${drive}\\`, name: drive, kind: 'drive' as const }));
    }
    if (process.platform === 'darwin') {
        // The system volume is a link to "/": it is not an external drive
        return drivesIn('/Volumes').filter((drive) => realPath(drive.path) !== '/');
    }
    const user = os.userInfo().username;
    const media = drivesIn('/media').filter((drive) => drive.name !== user);
    return [...drivesIn(path.join('/media', user)), ...drivesIn(path.join('/run/media', user)), ...media, ...drivesIn('/mnt')];
}

/** Real path of a file, following links */
function realPath(target: string): string {
    try {
        return fs.realpathSync(target);
    } catch {
        return path.resolve(target);
    }
}

/** Tells whether a path is a folder or inside it */
export function isInside(target: string, folder: string): boolean {
    const relative = path.relative(folder, target);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

/**
 * Roots of the file manager.
 * @param showFolder - Folder of the open show, null without a show
 */
export function fileRoots(showFolder: string | null): FileRoot[] {
    const home = os.homedir();
    const roots: FileRoot[] = [{ path: home, name: path.basename(home), kind: 'home' }, ...externalDrives()];
    if (showFolder !== null && !roots.some((root) => isInside(showFolder, root.path))) {
        roots.push({ path: showFolder, name: path.basename(showFolder), kind: 'show' });
    }
    return roots;
}

/**
 * Real location of a path, also when it does not exist yet: the real path of
 * its nearest existing folder plus the rest.
 */
function realLocation(target: string): string {
    let existing = path.resolve(target);
    const rest: string[] = [];
    while (!fs.existsSync(existing)) {
        const parent = path.dirname(existing);
        if (parent === existing) {
            break;
        }
        rest.unshift(path.basename(existing));
        existing = parent;
    }
    return path.join(realPath(existing), ...rest);
}

/**
 * Checks a path coming from the interface and returns it absolute.
 * @throws EngineError "file-not-allowed" when it is outside every root
 */
export function allowedPath(target: string, showFolder: string | null): string {
    const resolved = path.resolve(target);
    const real = realLocation(resolved);
    if (!path.isAbsolute(target) || !fileRoots(showFolder).some((root) => isInside(real, realPath(root.path)))) {
        throw new EngineError('file-not-allowed', `Outside the folders of the file manager: ${target}`);
    }
    return resolved;
}
