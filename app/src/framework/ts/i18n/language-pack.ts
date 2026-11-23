/**
 * Pacchetti di lingua: un file JSON per lingua con i dati della lingua
 * (meta) e i testi (messages). Le strutture scaricate vengono verificate,
 * perché i pacchetti possono essere installati dall'utente.
 */

import { fetchJson } from '../net/fetch-json.js';
import type { MessageTree } from './translator.js';

/** Versione del formato dei pacchetti supportata */
export const LANGUAGE_PACK_FORMAT = 1;

/** Lingua disponibile: codice (ad esempio "en", "pt-BR") e nome nella lingua stessa */
export interface LanguageInfo {
    code: string;
    name: string;
}

/** Dati di un pacchetto di lingua */
export interface LanguageMeta extends LanguageInfo {
    formatVersion: number;
}

/** Pacchetto di lingua completo */
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
 * Scarica e verifica un pacchetto di lingua.
 */
export async function loadLanguagePack(url: string): Promise<LanguagePack> {
    const data = await fetchJson(url);

    if (!isObject(data) || !isLanguageMeta(data.meta) || !isObject(data.messages)) {
        throw new Error(`Pacchetto di lingua non valido: ${url}`);
    }
    if (data.meta.formatVersion !== LANGUAGE_PACK_FORMAT) {
        throw new Error(`Versione del formato non supportata in ${url}`);
    }

    return data as unknown as LanguagePack;
}

/**
 * Scarica e verifica l'elenco delle lingue disponibili.
 */
export async function loadLanguageList(url: string): Promise<LanguageInfo[]> {
    const data = await fetchJson(url);

    if (!Array.isArray(data)) {
        throw new Error(`Elenco delle lingue non valido: ${url}`);
    }

    return data.filter(isLanguageInfo).map(({ code, name }) => ({ code, name }));
}
