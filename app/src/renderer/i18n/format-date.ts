/**
 * Formattazione di date e ore nella lingua attiva.
 */

import { currentLocale } from './i18n.js';

/**
 * Restituisce data e ora brevi, ad esempio "23 nov 2026, 18:30".
 */
export function formatDateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
