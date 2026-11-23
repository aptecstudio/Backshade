/**
 * Localization of the Backshade interface: language choice, texts
 * and language change.
 *
 * - The reference language is English: the valid keys are those of en.json
 *   and texts missing in another language are taken from English.
 * - The available languages (included and installed by the user) come from the
 *   main process through /locales/index.json.
 * - The choice is saved on the device; without a choice the system language
 *   is used, if available, otherwise English.
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

/** Structure of the texts, derived from the reference language */
export type Messages = typeof import('../../locales/en.json')['messages'];

/** Key of an interface text */
export type TextKey = MessageKey<Messages>;

/** Reference and default language */
export const DEFAULT_LOCALE = 'en';

const LOCALES_URL = '/locales';
const preference = new LocalPreference('backshade.locale');

let translate: Translate<Messages> | null = null;
let activeLocale = DEFAULT_LOCALE;
let locales: LanguageInfo[] = [];

/**
 * Address of the pack of a language.
 */
function packUrl(code: string): string {
    return `${LOCALES_URL}/${code}.json`;
}

/**
 * Chooses and loads the language. To be called once, before using t().
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
            console.warn(`Language "${code}" not loaded, using English`, error);
        }
    }

    translate = createTranslator(pack.messages, reference.messages as Messages);
    activeLocale = pack.meta.code;
    document.documentElement.lang = activeLocale;
}

/**
 * Returns the text of a key in the active language.
 */
export function t(key: TextKey, params?: MessageParams): string {
    if (translate === null) {
        throw new Error('Localization not initialized: call initI18n() before t()');
    }
    return translate(key, params);
}

/**
 * Translates a key read from the DOM, where its type cannot be checked.
 */
export function translateKey(key: string): string {
    return t(key as TextKey);
}

/**
 * Available languages, with the name in the language itself.
 */
export function availableLocales(): readonly LanguageInfo[] {
    return locales;
}

/**
 * Reads the list of available languages again, for example after a pack has
 * been installed. The active language does not change.
 */
export async function refreshLocales(): Promise<readonly LanguageInfo[]> {
    locales = await loadLanguageList(`${LOCALES_URL}/index.json`);
    return locales;
}

/**
 * Code of the active language.
 */
export function currentLocale(): string {
    return activeLocale;
}

/**
 * Saves the chosen language for this device and reloads the interface,
 * so every component is rebuilt with the new texts.
 */
export function changeLocale(code: string): void {
    preference.set(code);
    window.location.reload();
}
