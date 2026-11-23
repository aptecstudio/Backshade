/**
 * Libreria dei modelli di show. Un modello è una cartella show completa
 * con in più template.json (nome e descrizione). I modelli inclusi sono
 * in sola lettura; quelli dell'utente stanno nella cartella dati dell'utente.
 */

import fs from 'node:fs';
import path from 'node:path';
import { SHOW_FOLDER_EXTENSION } from '../../shared/show/show-document';
import type { LocalizedText, TemplateInfo } from '../../shared/transport/engine-api';
import { BUNDLED_TEMPLATES_DIR, USER_TEMPLATES_DIR } from '../paths';
import { TRANSIENT_ENTRIES, isShowFolder } from '../shows/show-files';
import { copyFolder } from '../storage/copy-folder';
import { toFileName, uniquePath } from '../storage/file-names';
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-file';
import { EngineError } from '../transport/engine-error';

/** File con nome e descrizione del modello */
export const TEMPLATE_FILE = 'template.json';

/** Elementi del modello da non copiare in un nuovo show */
export const TEMPLATE_ONLY_ENTRIES: readonly string[] = [TEMPLATE_FILE];

/** Modello trovato su disco */
export interface TemplateRecord extends TemplateInfo {
    folder: string;
}

const SOURCES: ReadonlyArray<[TemplateInfo['source'], string]> = [
    ['bundled', BUNDLED_TEMPLATES_DIR],
    ['user', USER_TEMPLATES_DIR]
];

function isLocalizedText(value: unknown): value is LocalizedText {
    if (typeof value === 'string') {
        return true;
    }
    return typeof value === 'object' && value !== null
        && Object.values(value).every((text) => typeof text === 'string');
}

/**
 * Legge un modello; restituisce null se la cartella non è un modello valido.
 */
function readTemplate(source: TemplateInfo['source'], folder: string): TemplateRecord | null {
    if (!isShowFolder(folder)) {
        return null;
    }
    try {
        const meta = readJsonFile(path.join(folder, TEMPLATE_FILE)) as { name?: unknown; description?: unknown } | undefined;
        const fallbackName = path.basename(folder, SHOW_FOLDER_EXTENSION);
        return {
            id: `${source}:${path.basename(folder, SHOW_FOLDER_EXTENSION)}`,
            name: isLocalizedText(meta?.name) ? meta.name : fallbackName,
            description: isLocalizedText(meta?.description) ? meta.description : '',
            source,
            folder
        };
    } catch (error) {
        console.warn(`Modello ignorato, template.json non leggibile: ${folder}`, error);
        return null;
    }
}

/**
 * Restituisce tutti i modelli: prima quelli inclusi, poi quelli dell'utente.
 */
export function listTemplates(): TemplateRecord[] {
    const records: TemplateRecord[] = [];
    for (const [source, directory] of SOURCES) {
        if (!fs.existsSync(directory)) {
            continue;
        }
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            if (entry.isDirectory() && entry.name.endsWith(SHOW_FOLDER_EXTENSION)) {
                const record = readTemplate(source, path.join(directory, entry.name));
                if (record !== null) {
                    records.push(record);
                }
            }
        }
    }
    return records;
}

/**
 * Cerca un modello per identificativo.
 * @throws EngineError "template-not-found"
 */
export function findTemplate(id: string): TemplateRecord {
    const record = listTemplates().find((template) => template.id === id);
    if (record === undefined) {
        throw new EngineError('template-not-found', `Modello non trovato: ${id}`);
    }
    return record;
}

/**
 * Cerca un modello dell'utente, l'unico tipo modificabile.
 * @throws EngineError "template-read-only" per i modelli inclusi
 */
function findUserTemplate(id: string): TemplateRecord {
    const record = findTemplate(id);
    if (record.source !== 'user') {
        throw new EngineError('template-read-only', 'I modelli inclusi non si possono modificare');
    }
    return record;
}

/**
 * Crea un modello dell'utente copiando la cartella di uno show salvato.
 */
export function createTemplateFromShow(showFolder: string, name: string, description: string): TemplateRecord {
    fs.mkdirSync(USER_TEMPLATES_DIR, { recursive: true });
    const folder = uniquePath(USER_TEMPLATES_DIR, toFileName(name), SHOW_FOLDER_EXTENSION);
    copyFolder(showFolder, folder, TRANSIENT_ENTRIES);
    writeJsonFileAtomic(path.join(folder, TEMPLATE_FILE), { name: name.trim(), description: description.trim() });
    return readTemplate('user', folder) as TemplateRecord;
}

/**
 * Cambia nome e descrizione di un modello dell'utente.
 */
export function updateTemplate(id: string, name: string, description: string): TemplateRecord {
    const record = findUserTemplate(id);
    if (name.trim() === '') {
        throw new EngineError('invalid-name', 'Nome vuoto');
    }
    writeJsonFileAtomic(path.join(record.folder, TEMPLATE_FILE), { name: name.trim(), description: description.trim() });
    return readTemplate('user', record.folder) as TemplateRecord;
}

/**
 * Elimina un modello dell'utente.
 */
export function deleteTemplate(id: string): void {
    fs.rmSync(findUserTemplate(id).folder, { recursive: true, force: true });
}
