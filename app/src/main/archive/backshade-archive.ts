/**
 * Backshade archives (.bshow for shows, .btemplate for templates): ZIP
 * files with archive.json (kind, version, name) and the content/ folder with
 * the content of the show or template folder.
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

/** Archive kind */
export type ArchiveKind = 'show' | 'template';

/** Extension of each archive kind, without the dot */
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
 * Lists the files of a folder, excluding the given top-level entries.
 */
function collectFiles(folder: string, exclude: readonly string[]): string[] {
    return fs.readdirSync(folder, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.relative(folder, path.join(entry.parentPath, entry.name)))
        .filter((relative) => !exclude.includes(relative.split(path.sep)[0]))
        .sort();
}

/**
 * Creates the archive of a folder.
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

    // Writes to a temporary file, renamed only when the work is done
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
 * Extracts an archive into a new folder inside parentFolder and
 * returns it. If the archive is not valid, nothing is left on disk.
 * @throws EngineError "invalid-archive" or "wrong-archive-kind"
 */
export async function unpackArchive(archive: string, parentFolder: string, kind: ArchiveKind): Promise<string> {
    await fs.promises.mkdir(parentFolder, { recursive: true });
    const staging = path.join(parentFolder, `.importing-${randomUUID()}`);
    await fs.promises.mkdir(staging);

    try {
        try {
            await extractZip(archive, staging);
        } catch (error) {
            throw new EngineError('invalid-archive', `Invalid archive: ${error instanceof Error ? error.message : String(error)}`);
        }

        let meta: Partial<ArchiveMeta> | undefined;
        try {
            meta = readJsonFile(path.join(staging, META_FILE)) as Partial<ArchiveMeta> | undefined;
        } catch {
            meta = undefined;
        }
        if (meta === undefined || typeof meta.name !== 'string' || typeof meta.formatVersion !== 'number'
            || !fs.existsSync(path.join(staging, CONTENT_FOLDER))) {
            throw new EngineError('invalid-archive', 'Archive without Backshade data');
        }
        if (meta.kind !== kind) {
            throw new EngineError('wrong-archive-kind', `The archive contains a ${String(meta.kind)}, not a ${kind}`);
        }
        if (meta.formatVersion > FORMAT_VERSION) {
            throw new EngineError('newer-show-format', 'Archive created with a newer version of Backshade');
        }

        const folder = uniquePath(parentFolder, toFileName(meta.name), SHOW_FOLDER_EXTENSION);
        await fs.promises.rename(path.join(staging, CONTENT_FOLDER), folder);
        return folder;
    } finally {
        await fs.promises.rm(staging, { recursive: true, force: true });
    }
}
