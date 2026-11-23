/**
 * Formattazione delle dimensioni dei file nella lingua attiva (unità decimali).
 */

import { currentLocale, t } from './i18n.js';

const UNITS = ['units.bytes', 'units.kilobytes', 'units.megabytes', 'units.gigabytes'] as const;

/**
 * Restituisce una dimensione leggibile, ad esempio "12,4 MB".
 */
export function formatSize(bytes: number): string {
    let value = bytes;
    let unit = 0;
    while (value >= 1000 && unit < UNITS.length - 1) {
        value /= 1000;
        unit++;
    }
    const formatted = new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value);
    return t(UNITS[unit], { value: formatted });
}
