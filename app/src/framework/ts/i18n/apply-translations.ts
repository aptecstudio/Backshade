/**
 * Applies translations to DOM elements through declarative attributes:
 * - data-i18n="key": text of the element;
 * - data-i18n-title="key": title attribute;
 * - data-i18n-aria-label="key": aria-label attribute.
 * The text is always inserted as text, never as HTML.
 */

import { queryAll } from '../dom/query.js';

/** Function that translates a key read from an attribute */
export type TranslateKey = (key: string) => string;

const ATTRIBUTE_TARGETS: ReadonlyArray<[string, string]> = [
    ['data-i18n-title', 'title'],
    ['data-i18n-aria-label', 'aria-label']
];

/**
 * Translates the root element and all its descendants with data-i18n attributes.
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
