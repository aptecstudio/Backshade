/**
 * Formatting of dates and times in the active language.
 */

import { currentLocale } from './i18n.js';

/**
 * Returns a short date and time, for example "23 Nov 2026, 18:30".
 */
export function formatDateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
