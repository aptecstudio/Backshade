/**
 * Library of show templates. A template is a complete show folder
 * with an additional template.json (name and description). Included templates are
 * read-only; user templates live in the user data folder.
 */

import fs from 'node:fs';
import path from 'node:path';
import { SHOW_FOLDER_EXTENSION } from '../../shared/show/show-document';
import type { LocalizedText, TemplateInfo } from '../../shared/transport/engine-api';
import { BUNDLED_TEMPLATES_DIR, USER_TEMPLATES_DIR } from '../paths';
import { SHOW_FILE, TRANSIENT_ENTRIES, isShowFolder } from '../shows/show-files';
import { copyFolder } from '../storage/copy-folder';
import { toFileName, uniquePath } from '../storage/file-names';
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-file';
import { EngineError } from '../transport/engine-error';

/** File with the name and description of the template */
export const TEMPLATE_FILE = 'template.json';

/** Template entries not to copy into a new show */
export const TEMPLATE_ONLY_ENTRIES: readonly string[] = [TEMPLATE_FILE];

/** Template found on disk */
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
 * Reads a template; returns null if the folder is not a valid template.
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
        console.warn(`Template ignored, unreadable template.json: ${folder}`, error);
        return null;
    }
}

/**
 * Reads a template that has just been created or imported.
 * @throws EngineError "invalid-archive" if the folder does not contain a show
 */
export function readTemplateFolder(source: TemplateInfo['source'], folder: string): TemplateRecord {
    const record = readTemplate(source, folder);
    if (record === null) {
        fs.rmSync(folder, { recursive: true, force: true });
        throw new EngineError('invalid-archive', 'The template does not contain a valid show');
    }
    return record;
}

/**
 * Returns all the templates: first the included ones, then the user ones.
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
 * Finds a template by identifier.
 * @throws EngineError "template-not-found"
 */
export function findTemplate(id: string): TemplateRecord {
    const record = listTemplates().find((template) => template.id === id);
    if (record === undefined) {
        throw new EngineError('template-not-found', `Template not found: ${id}`);
    }
    return record;
}

/**
 * Finds a user template, the only editable kind.
 * @throws EngineError "template-read-only" for included templates
 */
function findUserTemplate(id: string): TemplateRecord {
    const record = findTemplate(id);
    if (record.source !== 'user') {
        throw new EngineError('template-read-only', 'Included templates cannot be changed');
    }
    return record;
}

/**
 * Creates a user template by copying the folder of a saved show.
 */
export function createTemplateFromShow(showFolder: string, name: string, description: string): TemplateRecord {
    fs.mkdirSync(USER_TEMPLATES_DIR, { recursive: true });
    const folder = uniquePath(USER_TEMPLATES_DIR, toFileName(name), SHOW_FOLDER_EXTENSION);
    copyFolder(showFolder, folder, TRANSIENT_ENTRIES);
    // A template never carries the operators and their PINs
    const showFile = path.join(folder, SHOW_FILE);
    writeJsonFileAtomic(showFile, { ...(readJsonFile(showFile) as object), operators: [] });
    writeJsonFileAtomic(path.join(folder, TEMPLATE_FILE), { name: name.trim(), description: description.trim() });
    return readTemplateFolder('user', folder);
}

/**
 * Changes the name and description of a user template.
 */
export function updateTemplate(id: string, name: string, description: string): TemplateRecord {
    const record = findUserTemplate(id);
    if (name.trim() === '') {
        throw new EngineError('invalid-name', 'Empty name');
    }
    writeJsonFileAtomic(path.join(record.folder, TEMPLATE_FILE), { name: name.trim(), description: description.trim() });
    return readTemplateFolder('user', record.folder);
}

/**
 * Deletes a user template.
 */
export function deleteTemplate(id: string): void {
    fs.rmSync(findUserTemplate(id).folder, { recursive: true, force: true });
}
