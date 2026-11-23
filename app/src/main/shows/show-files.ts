/**
 * File di uno show su disco: lettura e verifica di show.json, salvataggio
 * atomico con copia in history/, copia di recupero in autosave/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { SHOW_FORMAT_VERSION, type ShowDocument } from '../../shared/show/show-document';
import { normalizeShowSettings } from '../../shared/show/show-settings';
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-file';
import { EngineError } from '../transport/engine-error';

export const SHOW_FILE = 'show.json';
export const AUTOSAVE_FOLDER = 'autosave';
export const HISTORY_FOLDER = 'history';
// Elementi da non copiare quando si duplica uno show o un modello
export const TRANSIENT_ENTRIES: readonly string[] = [AUTOSAVE_FOLDER, HISTORY_FOLDER];
// Numero di versioni precedenti conservate in history/
const HISTORY_SIZE = 10;

/**
 * Verifica il contenuto di show.json.
 */
function toShowDocument(data: unknown, file: string): ShowDocument {
    if (typeof data !== 'object' || data === null) {
        throw new EngineError('invalid-show', `File dello show non valido: ${file}`);
    }
    const document = data as Partial<ShowDocument>;
    if (typeof document.formatVersion !== 'number' || typeof document.id !== 'string'
        || typeof document.name !== 'string') {
        throw new EngineError('invalid-show', `File dello show non valido: ${file}`);
    }
    if (document.formatVersion > SHOW_FORMAT_VERSION) {
        throw new EngineError('newer-show-format', `Show creato con una versione più recente di Backshade: ${file}`);
    }
    return { ...(data as ShowDocument), settings: normalizeShowSettings(document.settings) };
}

/**
 * Indica se una cartella contiene uno show.
 */
export function isShowFolder(folder: string): boolean {
    return fs.existsSync(path.join(folder, SHOW_FILE));
}

/**
 * Legge show.json di una cartella.
 * @throws EngineError "show-not-found" o "invalid-show"
 */
export function readShow(folder: string): ShowDocument {
    const file = path.join(folder, SHOW_FILE);
    let data: unknown;
    try {
        data = readJsonFile(file);
    } catch {
        throw new EngineError('invalid-show', `File dello show non leggibile: ${file}`);
    }
    if (data === undefined) {
        throw new EngineError('show-not-found', `Nessuno show nella cartella: ${folder}`);
    }
    return toShowDocument(data, file);
}

/**
 * Salva show.json, conservando la versione precedente in history/.
 * @param keepHistory - false per i file appena copiati, che non hanno una storia
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
 * Tiene solo le versioni più recenti in history/.
 */
function pruneHistory(historyFolder: string): void {
    const files = fs.readdirSync(historyFolder).filter((name) => name.endsWith('.json')).sort();
    for (const name of files.slice(0, Math.max(0, files.length - HISTORY_SIZE))) {
        fs.rmSync(path.join(historyFolder, name), { force: true });
    }
}

/**
 * Scrive la copia di recupero.
 */
export function writeAutosave(folder: string, document: ShowDocument): void {
    writeJsonFileAtomic(path.join(folder, AUTOSAVE_FOLDER, SHOW_FILE), document);
}

/**
 * Indica se esiste una copia di recupero più recente dell'ultimo salvataggio.
 */
export function hasNewerAutosave(folder: string): boolean {
    const autosave = path.join(folder, AUTOSAVE_FOLDER, SHOW_FILE);
    if (!fs.existsSync(autosave)) {
        return false;
    }
    return fs.statSync(autosave).mtimeMs > fs.statSync(path.join(folder, SHOW_FILE)).mtimeMs;
}

/**
 * Legge la copia di recupero.
 */
export function readAutosave(folder: string): ShowDocument {
    const file = path.join(folder, AUTOSAVE_FOLDER, SHOW_FILE);
    let data: unknown;
    try {
        data = readJsonFile(file);
    } catch {
        throw new EngineError('invalid-show', `Copia di recupero non leggibile: ${file}`);
    }
    if (data === undefined) {
        throw new EngineError('no-recovery', 'Nessuna copia di recupero');
    }
    return toShowDocument(data, file);
}

/**
 * Elimina la copia di recupero.
 */
export function removeAutosave(folder: string): void {
    fs.rmSync(path.join(folder, AUTOSAVE_FOLDER), { recursive: true, force: true });
}
