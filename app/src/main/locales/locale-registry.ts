/**
 * Registro dei pacchetti di lingua: cerca i pacchetti inclusi
 * nell'applicazione e quelli installati dall'utente. A parità di codice
 * vince il pacchetto dell'utente, così una traduzione può essere corretta
 * senza aggiornare l'applicazione.
 *
 * Le cartelle vengono rilette a ogni richiesta: un pacchetto aggiunto
 * compare al successivo caricamento dell'interfaccia, senza riavvio.
 */

import fs from 'node:fs';
import path from 'node:path';
import { BUNDLED_LOCALES_DIR, USER_LOCALES_DIR } from '../paths';

/** Pacchetto di lingua trovato su disco */
export interface LocaleEntry {
    /** Codice della lingua, uguale al nome del file (ad esempio "it", "pt-BR") */
    code: string;
    /** Nome della lingua nella lingua stessa */
    name: string;
    /** Percorso del file */
    file: string;
}

// Codice lingua: due o tre lettere minuscole, regione opzionale in maiuscolo
const CODE_PATTERN = /^[a-z]{2,3}(-[A-Z]{2})?$/;
const SUPPORTED_FORMAT = 1;
const EXTENSION = '.json';

/**
 * Legge i dati di un pacchetto; restituisce null se il file non è valido.
 */
function readEntry(directory: string, fileName: string): LocaleEntry | null {
    const code = fileName.slice(0, -EXTENSION.length);
    const file = path.join(directory, fileName);

    if (!CODE_PATTERN.test(code)) {
        console.warn(`Pacchetto di lingua ignorato, nome del file non valido: ${file}`);
        return null;
    }

    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8')) as {
            meta?: { code?: unknown; name?: unknown; formatVersion?: unknown };
        };
        const meta = data.meta;
        if (meta === undefined || meta.code !== code || typeof meta.name !== 'string'
            || meta.formatVersion !== SUPPORTED_FORMAT) {
            console.warn(`Pacchetto di lingua ignorato, dati "meta" non validi: ${file}`);
            return null;
        }
        return { code, name: meta.name, file };
    } catch (error) {
        console.warn(`Pacchetto di lingua ignorato, JSON non leggibile: ${file}`, error);
        return null;
    }
}

/**
 * Restituisce i pacchetti validi di una cartella; nessuno se la cartella manca.
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
 * Crea la cartella dei pacchetti dell'utente, così è pronta per installarne di nuovi.
 */
export function ensureUserDirectory(): void {
    fs.mkdirSync(USER_LOCALES_DIR, { recursive: true });
}

/**
 * Restituisce tutte le lingue disponibili, ordinate per codice.
 */
export function listLocales(): LocaleEntry[] {
    const entries = new Map<string, LocaleEntry>();

    for (const entry of [...scan(BUNDLED_LOCALES_DIR), ...scan(USER_LOCALES_DIR)]) {
        entries.set(entry.code, entry);
    }

    return [...entries.values()].sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Cerca una lingua per codice.
 */
export function findLocale(code: string): LocaleEntry | undefined {
    return listLocales().find((entry) => entry.code === code);
}
