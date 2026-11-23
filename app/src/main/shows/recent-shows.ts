/**
 * Elenco degli show recenti, salvato nella cartella dati dell'utente.
 */

import path from 'node:path';
import { app } from 'electron';
import type { RecentShow } from '../../shared/transport/engine-api';
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-file';
import * as showFiles from './show-files';

const MAX_ENTRIES = 20;

interface RecentEntry {
    name: string;
    folder: string;
    openedAt: string;
}

function storeFile(): string {
    return path.join(app.getPath('userData'), 'recent-shows.json');
}

/**
 * Legge le voci salvate, ignorando quelle non valide.
 */
function readEntries(): RecentEntry[] {
    let data: unknown;
    try {
        data = readJsonFile(storeFile());
    } catch {
        return [];
    }
    if (!Array.isArray(data)) {
        return [];
    }
    return data.filter((entry): entry is RecentEntry => typeof entry === 'object' && entry !== null
        && typeof (entry as RecentEntry).name === 'string'
        && typeof (entry as RecentEntry).folder === 'string'
        && typeof (entry as RecentEntry).openedAt === 'string');
}

function writeEntries(entries: RecentEntry[]): void {
    writeJsonFileAtomic(storeFile(), entries.slice(0, MAX_ENTRIES));
}

/**
 * Restituisce gli show recenti, segnando quelli non più presenti.
 */
export function listRecentShows(): RecentShow[] {
    return readEntries().map((entry) => {
        let modifiedAt: string | null = null;
        let missing = true;
        if (showFiles.isShowFolder(entry.folder)) {
            try {
                modifiedAt = showFiles.readShow(entry.folder).modifiedAt;
                missing = false;
            } catch {
                missing = true;
            }
        }
        return { ...entry, modifiedAt, missing };
    });
}

/**
 * Mette uno show in cima ai recenti.
 */
export function addRecentShow(name: string, folder: string): void {
    const entries = readEntries().filter((entry) => path.resolve(entry.folder) !== path.resolve(folder));
    entries.unshift({ name, folder, openedAt: new Date().toISOString() });
    writeEntries(entries);
}

/**
 * Toglie uno show dai recenti.
 */
export function removeRecentShow(folder: string): void {
    writeEntries(readEntries().filter((entry) => path.resolve(entry.folder) !== path.resolve(folder)));
}

