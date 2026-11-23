/**
 * Global application settings, saved in the user data
 * folder and separate from the show settings.
 */

import path from 'node:path';
import { app } from 'electron';
import type { AppSettings } from '../../shared/transport/engine-api';
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-file';

function settingsFile(): string {
    return path.join(app.getPath('userData'), 'settings.json');
}

/**
 * Default values: new shows go to Documents/Backshade/Shows.
 */
function defaults(): AppSettings {
    return { defaultShowsFolder: path.join(app.getPath('documents'), 'Backshade', 'Shows') };
}

/**
 * Reads the settings; missing or invalid values take the default.
 */
export function readSettings(): AppSettings {
    const result = defaults();
    try {
        const data = readJsonFile(settingsFile()) as Partial<AppSettings> | undefined;
        if (typeof data?.defaultShowsFolder === 'string' && data.defaultShowsFolder !== '') {
            result.defaultShowsFolder = data.defaultShowsFolder;
        }
    } catch (error) {
        console.warn('Unreadable settings, using the default values', error);
    }
    return result;
}

/**
 * Saves the given settings, keeping the others.
 */
export function updateSettings(changes: Partial<AppSettings>): AppSettings {
    const next = { ...readSettings(), ...changes };
    writeJsonFileAtomic(settingsFile(), next);
    return next;
}
