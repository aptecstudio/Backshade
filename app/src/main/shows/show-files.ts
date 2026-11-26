/**
 * Files of a show on disk: reading and checking show.json, atomic
 * save with a copy in history/, recovery copy in autosave/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { SHOW_FORMAT_VERSION, type ShowDocument } from '../../shared/show/show-document';
import { normalizeAudio } from '../../shared/audio/audio';
import { normalizeMemories } from '../../shared/console/memories';
import { normalizeGrid } from '../../shared/grid/grid';
import { normalizeTimelines } from '../../shared/timeline/timeline';
import { normalizeVideo } from '../../shared/video/video';
import { normalizeOutput } from '../../shared/output/output-config';
import { normalizePatch } from '../../shared/patch/patch';
import { normalizeShowSettings } from '../../shared/show/show-settings';
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-file';
import { EngineError } from '../transport/engine-error';

export const SHOW_FILE = 'show.json';
export const AUTOSAVE_FOLDER = 'autosave';
export const HISTORY_FOLDER = 'history';
// Entries not to copy when duplicating a show or a template
export const TRANSIENT_ENTRIES: readonly string[] = [AUTOSAVE_FOLDER, HISTORY_FOLDER];
// Number of previous versions kept in history/
const HISTORY_SIZE = 10;

/**
 * Checks the content of show.json.
 */
function toShowDocument(data: unknown, file: string): ShowDocument {
    if (typeof data !== 'object' || data === null) {
        throw new EngineError('invalid-show', `Invalid show file: ${file}`);
    }
    const document = data as Partial<ShowDocument>;
    if (typeof document.formatVersion !== 'number' || typeof document.id !== 'string'
        || typeof document.name !== 'string') {
        throw new EngineError('invalid-show', `Invalid show file: ${file}`);
    }
    if (document.formatVersion > SHOW_FORMAT_VERSION) {
        throw new EngineError('newer-show-format', `Show created with a newer version of Backshade: ${file}`);
    }
    return {
        ...(data as ShowDocument),
        settings: normalizeShowSettings(document.settings),
        patch: normalizePatch(document.patch),
        output: normalizeOutput(document.output),
        memories: normalizeMemories(document.memories),
        grid: normalizeGrid(document.grid),
        audio: normalizeAudio(document.audio),
        video: normalizeVideo(document.video),
        timelines: normalizeTimelines(document.timelines)
    };
}

/**
 * Tells whether a folder contains a show.
 */
export function isShowFolder(folder: string): boolean {
    return fs.existsSync(path.join(folder, SHOW_FILE));
}

/**
 * Reads show.json of a folder.
 * @throws EngineError "show-not-found" or "invalid-show"
 */
export function readShow(folder: string): ShowDocument {
    const file = path.join(folder, SHOW_FILE);
    let data: unknown;
    try {
        data = readJsonFile(file);
    } catch {
        throw new EngineError('invalid-show', `Unreadable show file: ${file}`);
    }
    if (data === undefined) {
        throw new EngineError('show-not-found', `No show in the folder: ${folder}`);
    }
    return toShowDocument(data, file);
}

/**
 * Saves show.json, keeping the previous version in history/.
 * @param keepHistory - false for freshly copied files, which have no history
 */
export function writeShow(folder: string, document: ShowDocument, keepHistory = true): void {
    const file = path.join(folder, SHOW_FILE);

    if (keepHistory && fs.existsSync(file)) {
        const historyFolder = path.join(folder, HISTORY_FOLDER);
        fs.mkdirSync(historyFolder, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.copyFileSync(file, path.join(historyFolder, `show-${stamp}.json`));
        pruneHistory(historyFolder);
    }

    writeJsonFileAtomic(file, document);
}

/**
 * Keeps only the most recent versions in history/.
 */
function pruneHistory(historyFolder: string): void {
    const files = fs.readdirSync(historyFolder).filter((name) => name.endsWith('.json')).sort();
    for (const name of files.slice(0, Math.max(0, files.length - HISTORY_SIZE))) {
        fs.rmSync(path.join(historyFolder, name), { force: true });
    }
}

/**
 * Writes the recovery copy.
 */
export function writeAutosave(folder: string, document: ShowDocument): void {
    writeJsonFileAtomic(path.join(folder, AUTOSAVE_FOLDER, SHOW_FILE), document);
}

/**
 * Tells whether there is a recovery copy newer than the last save.
 */
export function hasNewerAutosave(folder: string): boolean {
    const autosave = path.join(folder, AUTOSAVE_FOLDER, SHOW_FILE);
    if (!fs.existsSync(autosave)) {
        return false;
    }
    return fs.statSync(autosave).mtimeMs > fs.statSync(path.join(folder, SHOW_FILE)).mtimeMs;
}

/**
 * Reads the recovery copy.
 */
export function readAutosave(folder: string): ShowDocument {
    const file = path.join(folder, AUTOSAVE_FOLDER, SHOW_FILE);
    let data: unknown;
    try {
        data = readJsonFile(file);
    } catch {
        throw new EngineError('invalid-show', `Unreadable recovery copy: ${file}`);
    }
    if (data === undefined) {
        throw new EngineError('no-recovery', 'No recovery copy');
    }
    return toShowDocument(data, file);
}

/**
 * Deletes the recovery copy.
 */
export function removeAutosave(folder: string): void {
    fs.rmSync(path.join(folder, AUTOSAVE_FOLDER), { recursive: true, force: true });
}
