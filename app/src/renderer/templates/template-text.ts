/**
 * Testi dei modelli: i modelli inclusi hanno nome e descrizione in più
 * lingue, quelli dell'utente in una sola.
 */

import type { LocalizedText } from '../../shared/transport/engine-api.js';
import { currentLocale, DEFAULT_LOCALE } from '../i18n/i18n.js';

/**
 * Restituisce il testo nella lingua attiva, o in inglese, o il primo disponibile.
 */
export function localized(text: LocalizedText): string {
    if (typeof text === 'string') {
        return text;
    }
    return text[currentLocale()] ?? text[DEFAULT_LOCALE] ?? Object.values(text)[0] ?? '';
}
