/**
 * Template texts: included templates have name and description in several
 * languages, user templates in a single one.
 */

import type { LocalizedText } from '../../shared/transport/engine-api.js';
import { currentLocale, DEFAULT_LOCALE } from '../i18n/i18n.js';

/**
 * Returns the text in the active language, or in English, or the first available one.
 */
export function localized(text: LocalizedText): string {
    if (typeof text === 'string') {
        return text;
    }
    return text[currentLocale()] ?? text[DEFAULT_LOCALE] ?? Object.values(text)[0] ?? '';
}
