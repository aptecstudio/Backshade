/**
 * Texts of the memories of the simple console.
 */

import type { SelectOption } from '../../../framework/ts/index.js';
import { CHASER_DIRECTIONS, type ChaserDirection, type MemoryKind } from '../../../shared/console/memories.js';
import { t } from '../../i18n/i18n.js';

/**
 * Short code of a memory place, for example "S5" or "C12".
 */
export function memoryCode(kind: MemoryKind, slot: number): string {
    return `${kind === 'scene' ? 'S' : 'C'}${slot}`;
}

/** Name of a chaser direction */
export function directionLabel(direction: ChaserDirection): string {
    return t(`memories.direction.${direction}`);
}

/** Chaser directions for a select field */
export function directionOptions(): SelectOption<ChaserDirection>[] {
    return CHASER_DIRECTIONS.map((direction) => ({ value: direction, label: directionLabel(direction) }));
}
