/**
 * Applica le traduzioni agli elementi del DOM tramite attributi dichiarativi:
 * - data-i18n="chiave": testo dell'elemento;
 * - data-i18n-title="chiave": attributo title;
 * - data-i18n-aria-label="chiave": attributo aria-label.
 * Il testo viene sempre inserito come testo, mai come HTML.
 */

import { queryAll } from '../dom/query.js';

/** Funzione che traduce una chiave letta da un attributo */
export type TranslateKey = (key: string) => string;

const ATTRIBUTE_TARGETS: ReadonlyArray<[string, string]> = [
    ['data-i18n-title', 'title'],
    ['data-i18n-aria-label', 'aria-label']
];

/**
 * Traduce l'elemento root e tutti i suoi discendenti con attributi data-i18n.
 */
export function applyTranslations(root: HTMLElement, translate: TranslateKey): void {
    const elements = [root, ...queryAll('*', root)];

    for (const element of elements) {
        const textKey = element.getAttribute('data-i18n');
        if (textKey !== null) {
            element.textContent = translate(textKey);
        }
        for (const [source, target] of ATTRIBUTE_TARGETS) {
            const key = element.getAttribute(source);
            if (key !== null) {
                element.setAttribute(target, translate(key));
            }
        }
    }
}
