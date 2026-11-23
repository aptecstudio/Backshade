/**
 * Language packs: one JSON file per language with the language data
 * (meta) and the texts (messages). Downloaded structures are checked,
 * because packs can be installed by the user.
 */

import { fetchJson } from '../net/fetch-json.js';
import type { MessageTree } from './translator.js';

/** Supported pack format version */
export const LANGUAGE_PACK_FORMAT = 1;

/** Available language: code (for example "en", "pt-BR") and name in the language itself */
export interface LanguageInfo {
    code: string;
    name: string;
}

/** Language pack data */
export interface LanguageMeta extends LanguageInfo {
    formatVersion: number;
}

/** Complete language pack */
export interface LanguagePack {
    meta: LanguageMeta;
    messages: MessageTree;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLanguageInfo(value: unknown): value is LanguageInfo {
    return isObject(value) && typeof value.code === 'string' && typeof value.name === 'string';
}

function isLanguageMeta(value: unknown): value is LanguageMeta {
    return isLanguageInfo(value) && typeof (value as Partial<LanguageMeta>).formatVersion === 'number';
}

/**
 * Downloads and checks a language pack.
 */
export async function loadLanguagePack(url: string): Promise<LanguagePack> {
    const data = await fetchJson(url);

    if (!isObject(data) || !isLanguageMeta(data.meta) || !isObject(data.messages)) {
        throw new Error(`Invalid language pack: ${url}`);
    }
    if (data.meta.formatVersion !== LANGUAGE_PACK_FORMAT) {
        throw new Error(`Unsupported format version in ${url}`);
    }

    return data as unknown as LanguagePack;
}

/**
 * Downloads and checks the list of available languages.
 */
export async function loadLanguageList(url: string): Promise<LanguageInfo[]> {
    const data = await fetchJson(url);

    if (!Array.isArray(data)) {
        throw new Error(`Invalid language list: ${url}`);
    }

    return data.filter(isLanguageInfo).map(({ code, name }) => ({ code, name }));
}
