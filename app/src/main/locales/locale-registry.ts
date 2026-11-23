/**
 * Registry of the language packs: finds the packs included in
 * the application and those installed by the user. With the same code
 * the user pack wins, so a translation can be corrected
 * without updating the application.
 *
 * The folders are read again at every request: an added pack
 * appears at the next load of the interface, without restarting.
 */

import fs from 'node:fs';
import path from 'node:path';
import { BUNDLED_LOCALES_DIR, USER_LOCALES_DIR } from '../paths';

/** Language pack found on disk */
export interface LocaleEntry {
    /** Language code, equal to the file name (for example "it", "pt-BR") */
    code: string;
    /** Name of the language in the language itself */
    name: string;
    /** File path */
    file: string;
}

// Language code: two or three lowercase letters, optional uppercase region
const CODE_PATTERN = /^[a-z]{2,3}(-[A-Z]{2})?$/;
const SUPPORTED_FORMAT = 1;
const EXTENSION = '.json';

/**
 * Reads the data of a pack; returns null if the file is not valid.
 */
function readEntry(directory: string, fileName: string): LocaleEntry | null {
    const code = fileName.slice(0, -EXTENSION.length);
    const file = path.join(directory, fileName);

    if (!CODE_PATTERN.test(code)) {
        console.warn(`Language pack ignored, invalid file name: ${file}`);
        return null;
    }

    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8')) as {
            meta?: { code?: unknown; name?: unknown; formatVersion?: unknown };
        };
        const meta = data.meta;
        if (meta === undefined || meta.code !== code || typeof meta.name !== 'string'
            || meta.formatVersion !== SUPPORTED_FORMAT) {
            console.warn(`Language pack ignored, invalid "meta" data: ${file}`);
            return null;
        }
        return { code, name: meta.name, file };
    } catch (error) {
        console.warn(`Language pack ignored, unreadable JSON: ${file}`, error);
        return null;
    }
}

/**
 * Returns the valid packs of a folder; none if the folder is missing.
 */
function scan(directory: string): LocaleEntry[] {
    if (!fs.existsSync(directory)) {
        return [];
    }
    return fs.readdirSync(directory)
        .filter((fileName) => fileName.endsWith(EXTENSION))
        .map((fileName) => readEntry(directory, fileName))
        .filter((entry): entry is LocaleEntry => entry !== null);
}

/**
 * Creates the folder of the user packs, so it is ready for new ones.
 */
export function ensureUserDirectory(): void {
    fs.mkdirSync(USER_LOCALES_DIR, { recursive: true });
}

/**
 * Returns all the available languages, sorted by code.
 */
export function listLocales(): LocaleEntry[] {
    const entries = new Map<string, LocaleEntry>();

    for (const entry of [...scan(BUNDLED_LOCALES_DIR), ...scan(USER_LOCALES_DIR)]) {
        entries.set(entry.code, entry);
    }

    return [...entries.values()].sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Finds a language by code.
 */
export function findLocale(code: string): LocaleEntry | undefined {
    return listLocales().find((entry) => entry.code === code);
}
