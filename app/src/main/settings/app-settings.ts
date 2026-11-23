/**
 * Impostazioni globali dell'applicazione, salvate nella cartella dati
 * dell'utente e separate dalle impostazioni degli show.
 */

import path from 'node:path';
import { app } from 'electron';
import type { AppSettings } from '../../shared/transport/engine-api';
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-file';

function settingsFile(): string {
    return path.join(app.getPath('userData'), 'settings.json');
}

/**
 * Valori predefiniti: i nuovi show vanno in Documenti/Backshade/Shows.
 */
function defaults(): AppSettings {
    return { defaultShowsFolder: path.join(app.getPath('documents'), 'Backshade', 'Shows') };
}

/**
 * Legge le impostazioni; i valori mancanti o non validi prendono il predefinito.
 */
export function readSettings(): AppSettings {
    const result = defaults();
    try {
        const data = readJsonFile(settingsFile()) as Partial<AppSettings> | undefined;
        if (typeof data?.defaultShowsFolder === 'string' && data.defaultShowsFolder !== '') {
            result.defaultShowsFolder = data.defaultShowsFolder;
        }
    } catch (error) {
        console.warn('Impostazioni non leggibili, uso i valori predefiniti', error);
    }
    return result;
}

/**
 * Salva le impostazioni indicate, mantenendo le altre.
 */
export function updateSettings(changes: Partial<AppSettings>): AppSettings {
    const next = { ...readSettings(), ...changes };
    writeJsonFileAtomic(settingsFile(), next);
    return next;
}
