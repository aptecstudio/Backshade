/**
 * Archivi Backshade (.bshow per gli show, .btemplate per i modelli): file
 * ZIP con archive.json (tipo, versione, nome) e la cartella content/ con il
 * contenuto della cartella dello show o del modello.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { SHOW_FOLDER_EXTENSION } from '../../shared/show/show-document';
import { toFileName, uniquePath } from '../storage/file-names';
import { readJsonFile } from '../storage/json-file';
import { EngineError } from '../transport/engine-error';
import { extractZip } from './zip-reader';
import { writeZip, type ZipSource } from './zip-writer';

/** Tipo di archivio */
export type ArchiveKind = 'show' | 'template';

/** Estensione di ogni tipo di archivio, senza punto */
export const ARCHIVE_EXTENSIONS: Readonly<Record<ArchiveKind, string>> = { show: 'bshow', template: 'btemplate' };

const META_FILE = 'archive.json';
const CONTENT_FOLDER = 'content';
const FORMAT_VERSION = 1;

interface ArchiveMeta {
    kind: ArchiveKind;
    formatVersion: number;
    name: string;
    createdWith: string;
}

/**
 * Elenca i file di una cartella, esclusi gli elementi di primo livello indicati.
 */
function collectFiles(folder: string, exclude: readonly string[]): string[] {
    return fs.readdirSync(folder, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.relative(folder, path.join(entry.parentPath, entry.name)))
        .filter((relative) => !exclude.includes(relative.split(path.sep)[0]))
        .sort();
}

/**
 * Crea l'archivio di una cartella.
 */
export async function packFolder(folder: string, target: string, kind: ArchiveKind, name: string, exclude: readonly string[]): Promise<void> {
    const meta: ArchiveMeta = { kind, formatVersion: FORMAT_VERSION, name, createdWith: app.getVersion() };
    const sources: ZipSource[] = [
        { name: META_FILE, data: Buffer.from(`${JSON.stringify(meta, null, 2)}\n`) },
        ...collectFiles(folder, exclude).map((relative) => ({
            name: `${CONTENT_FOLDER}/${relative.split(path.sep).join('/')}`,
            file: path.join(folder, relative)
        }))
    ];

    // Scrittura in un file temporaneo, rinominato solo a lavoro finito
    const temporary = `${target}.${process.pid}.tmp`;
    try {
        await writeZip(temporary, sources);
        await fs.promises.rename(temporary, target);
    } catch (error) {
        await fs.promises.rm(temporary, { force: true });
        throw error;
    }
}

/**
 * Estrae un archivio in una nuova cartella dentro parentFolder e la
 * restituisce. Se l'archivio non è valido non lascia nulla su disco.
 * @throws EngineError "invalid-archive" o "wrong-archive-kind"
 */
export async function unpackArchive(archive: string, parentFolder: string, kind: ArchiveKind): Promise<string> {
    await fs.promises.mkdir(parentFolder, { recursive: true });
    const staging = path.join(parentFolder, `.importing-${randomUUID()}`);
    await fs.promises.mkdir(staging);

    try {
        try {
            await extractZip(archive, staging);
        } catch (error) {
            throw new EngineError('invalid-archive', `Archivio non valido: ${error instanceof Error ? error.message : String(error)}`);
        }

        let meta: Partial<ArchiveMeta> | undefined;
        try {
            meta = readJsonFile(path.join(staging, META_FILE)) as Partial<ArchiveMeta> | undefined;
        } catch {
            meta = undefined;
        }
        if (meta === undefined || typeof meta.name !== 'string' || typeof meta.formatVersion !== 'number'
            || !fs.existsSync(path.join(staging, CONTENT_FOLDER))) {
            throw new EngineError('invalid-archive', 'Archivio senza dati Backshade');
        }
        if (meta.kind !== kind) {
            throw new EngineError('wrong-archive-kind', `L'archivio contiene un ${String(meta.kind)}, non un ${kind}`);
        }
        if (meta.formatVersion > FORMAT_VERSION) {
            throw new EngineError('newer-show-format', 'Archivio creato con una versione più recente di Backshade');
        }

        const folder = uniquePath(parentFolder, toFileName(meta.name), SHOW_FOLDER_EXTENSION);
        await fs.promises.rename(path.join(staging, CONTENT_FOLDER), folder);
        return folder;
    } finally {
        await fs.promises.rm(staging, { recursive: true, force: true });
    }
}
