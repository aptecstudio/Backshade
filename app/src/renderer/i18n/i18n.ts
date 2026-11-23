/**
 * Localizzazione dell'interfaccia di Backshade: scelta della lingua, testi
 * e cambio lingua.
 *
 * - La lingua di riferimento è l'inglese: le chiavi valide sono quelle di en.json
 *   e i testi mancanti in un'altra lingua vengono presi dall'inglese.
 * - Le lingue disponibili (incluse e installate dall'utente) arrivano dal
 *   processo main tramite /locales/index.json.
 * - La scelta è salvata sul dispositivo; senza scelta si usa la lingua di
 *   sistema, se disponibile, altrimenti l'inglese.
 */

import {
    createTranslator,
    LocalPreference,
    loadLanguageList,
    loadLanguagePack,
    negotiateLocale,
    type LanguageInfo,
    type MessageKey,
    type MessageParams,
    type Translate
} from '../../framework/ts/index.js';

/** Struttura dei testi, ricavata dalla lingua di riferimento */
export type Messages = typeof import('../../locales/en.json')['messages'];

/** Chiave di un testo dell'interfaccia */
export type TextKey = MessageKey<Messages>;

/** Lingua di riferimento e predefinita */
export const DEFAULT_LOCALE = 'en';

const LOCALES_URL = '/locales';
const preference = new LocalPreference('backshade.locale');

let translate: Translate<Messages> | null = null;
let activeLocale = DEFAULT_LOCALE;
let locales: LanguageInfo[] = [];

/**
 * Indirizzo del pacchetto di una lingua.
 */
function packUrl(code: string): string {
    return `${LOCALES_URL}/${code}.json`;
}

/**
 * Sceglie e carica la lingua. Va chiamata una volta, prima di usare t().
 */
export async function initI18n(): Promise<void> {
    locales = await loadLanguageList(`${LOCALES_URL}/index.json`);

    const code = negotiateLocale(
        locales.map((locale) => locale.code),
        [preference.get(), ...navigator.languages],
        DEFAULT_LOCALE
    );

    const reference = await loadLanguagePack(packUrl(DEFAULT_LOCALE));
    let pack = reference;
    if (code !== DEFAULT_LOCALE) {
        try {
            pack = await loadLanguagePack(packUrl(code));
        } catch (error) {
            console.warn(`Lingua "${code}" non caricata, uso l'inglese`, error);
        }
    }

    translate = createTranslator(pack.messages, reference.messages as Messages);
    activeLocale = pack.meta.code;
    document.documentElement.lang = activeLocale;
}

/**
 * Restituisce il testo di una chiave nella lingua attiva.
 */
export function t(key: TextKey, params?: MessageParams): string {
    if (translate === null) {
        throw new Error('Localizzazione non inizializzata: chiamare initI18n() prima di t()');
    }
    return translate(key, params);
}

/**
 * Traduce una chiave letta dal DOM, dove il tipo non può essere verificato.
 */
export function translateKey(key: string): string {
    return t(key as TextKey);
}

/**
 * Lingue disponibili, con il nome nella lingua stessa.
 */
export function availableLocales(): readonly LanguageInfo[] {
    return locales;
}

/**
 * Rilegge l'elenco delle lingue disponibili, ad esempio dopo l'installazione
 * di un pacchetto. La lingua attiva non cambia.
 */
export async function refreshLocales(): Promise<readonly LanguageInfo[]> {
    locales = await loadLanguageList(`${LOCALES_URL}/index.json`);
    return locales;
}

/**
 * Codice della lingua attiva.
 */
export function currentLocale(): string {
    return activeLocale;
}

/**
 * Salva la lingua scelta per questo dispositivo e ricarica l'interfaccia,
 * così ogni componente viene ricreato con i nuovi testi.
 */
export function changeLocale(code: string): void {
    preference.set(code);
    window.location.reload();
}
