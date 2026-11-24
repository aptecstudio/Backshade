/**
 * Texts of the patch: fixture type, address range and state of a patched fixture.
 */

import { lastAddress } from '../../../shared/patch/address-map.js';
import type { PatchEntry } from '../../../shared/transport/engine-api.js';
import { t } from '../../i18n/i18n.js';

/** Manufacturer and model, or the identifier of a missing definition */
export function entryFixture(entry: PatchEntry): string {
    if (entry.manufacturer === null || entry.model === null) {
        return t('patch.unknownFixture', { definition: entry.definition });
    }
    return `${entry.manufacturer} ${entry.model}`;
}

/** Address range, for example "1 - 16", or one address for a single channel */
export function entryAddresses(entry: PatchEntry): string {
    const last = lastAddress(entry);
    return last === entry.address ? String(entry.address) : `${entry.address} - ${last}`;
}

/** State of a fixture, or null when it is fine */
export function entryProblem(entry: PatchEntry): string | null {
    if (entry.missing) {
        return t('patch.missing');
    }
    return entry.conflict ? t('patch.conflict') : null;
}
