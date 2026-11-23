/**
 * Media di uno show: file nella cartella media/ dello show, che è l'unica
 * fonte di verità. I percorsi sono relativi a media/ e usano "/" come
 * separatore, così lo show resta portabile tra sistemi diversi.
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
 * Converte un percorso relativo a media/ in un percorso assoluto, verificando
 * che resti dentro la cartella.
 * @throws EngineError "invalid-media-path"
 */
export function resolveMediaPath(showFolder: string, relative: string): string {
    const root = mediaRoot(showFolder);
    const absolute = path.resolve(root, ...relative.split('/'));
    if (relative === '' || !absolute.startsWith(root + path.sep)) {
        throw new EngineError('invalid-media-path', `Percorso del media non valido: ${relative}`);
    }
    return absolute;
}

/**
 * Elenca i media dello show, ordinati per nome; i file di tipo non
 * riconosciuto vengono ignorati.
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
 * Restituisce un nome libero in media/, aggiungendo un numero se esiste già.
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
 * Copia file esterni in media/. I file con tipo non ammesso vengono saltati.
 * La copia è asincrona per non bloccare il motore con i video grandi.
 * @returns i media importati
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
 * Elimina un media dalla cartella dello show.
 */
export function removeMedia(showFolder: string, relative: string): void {
    const absolute = resolveMediaPath(showFolder, relative);
    if (!fs.existsSync(absolute)) {
        throw new EngineError('media-not-found', `Media non trovato: ${relative}`);
    }
    fs.rmSync(absolute);
}
