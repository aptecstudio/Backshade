/**
 * Texts of an entry: size and date of the last change.
 */

import { currentLocale } from '../i18n/i18n.js';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** Size in the largest unit that keeps it above one, for example "3.4 MB" */
export function fileSize(bytes: number): string {
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < UNITS.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${value.toLocaleString(currentLocale(), { maximumFractionDigits: unit === 0 ? 0 : 1 })} ${UNITS[unit]}`;
}

/** Date and time of the last change */
export function fileDate(iso: string): string {
    return new Date(iso).toLocaleString(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' });
}
