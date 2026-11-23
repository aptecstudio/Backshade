/**
 * Media of a show: files in the media/ folder of the show, which is the only
 * source of truth. Paths are relative to media/ and use "/" as
 * separator, so the show stays portable between systems.
 */

import fs from 'node:fs';
import path from 'node:path';
import { mediaKindOf } from '../../shared/show/media-kinds';
import type { MediaItem } from '../../shared/transport/engine-api';
import { EngineError } from '../transport/engine-error';

export const MEDIA_FOLDER = 'media';

function mediaRoot(showFolder: string): string {
    return path.join(showFolder, MEDIA_FOLDER);
}

/**
 * Converts a path relative to media/ into an absolute path, checking
 * that it stays inside the folder.
 * @throws EngineError "invalid-media-path"
 */
export function resolveMediaPath(showFolder: string, relative: string): string {
    const root = mediaRoot(showFolder);
    const absolute = path.resolve(root, ...relative.split('/'));
    if (relative === '' || !absolute.startsWith(root + path.sep)) {
        throw new EngineError('invalid-media-path', `Invalid media path: ${relative}`);
    }
    return absolute;
}

/**
 * Lists the media of the show, sorted by name; files of an
 * unknown type are ignored.
 */
export function listMedia(showFolder: string): MediaItem[] {
    const root = mediaRoot(showFolder);
    if (!fs.existsSync(root)) {
        return [];
    }
    const items: MediaItem[] = [];
    for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
        const kind = mediaKindOf(entry.name);
        if (!entry.isFile() || kind === null) {
            continue;
        }
        const absolute = path.join(entry.parentPath, entry.name);
        const stat = fs.statSync(absolute);
        items.push({
            file: path.relative(root, absolute).split(path.sep).join('/'),
            name: entry.name,
            kind,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString()
        });
    }
    return items.sort((a, b) => a.file.localeCompare(b.file));
}

/**
 * Returns a free name in media/, adding a number if it already exists.
 */
function freeName(root: string, fileName: string): string {
    const extension = path.extname(fileName);
    const base = path.basename(fileName, extension);
    let candidate = fileName;
    for (let index = 2; fs.existsSync(path.join(root, candidate)); index++) {
        candidate = `${base} ${index}${extension}`;
    }
    return candidate;
}

/**
 * Copies external files into media/. Files of a type that is not allowed are skipped.
 * The copy is asynchronous so that large videos do not block the engine.
 * @returns the imported media
 */
export async function importMedia(showFolder: string, sources: readonly string[]): Promise<MediaItem[]> {
    const root = mediaRoot(showFolder);
    await fs.promises.mkdir(root, { recursive: true });

    const imported: string[] = [];
    for (const source of sources) {
        if (mediaKindOf(source) === null) {
            continue;
        }
        const name = freeName(root, path.basename(source));
        await fs.promises.copyFile(source, path.join(root, name), fs.constants.COPYFILE_EXCL);
        imported.push(name);
    }
    return listMedia(showFolder).filter((item) => imported.includes(item.file));
}

/**
 * Deletes a media file from the show folder.
 */
export function removeMedia(showFolder: string, relative: string): void {
    const absolute = resolveMediaPath(showFolder, relative);
    if (!fs.existsSync(absolute)) {
        throw new EngineError('media-not-found', `Media not found: ${relative}`);
    }
    fs.rmSync(absolute);
}
