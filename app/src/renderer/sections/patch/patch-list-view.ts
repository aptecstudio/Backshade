/**
 * List view of the patch: one table per universe in use, with fixtures
 * and the parts of the LED matrices.
 */

import { Stack } from '../../../framework/ts/index.js';
import { openRow } from './open-row.js';
import type { PatchRow } from './patch-rows.js';
import { UniverseTable } from './universe-table.js';

export class PatchListView extends Stack {
    constructor(entries: readonly PatchRow[]) {
        super({ gap: 12 });
        const universes = [...new Set(entries.map((entry) => entry.universe))].sort((a, b) => a - b);
        this.append(...universes.map((universe) => {
            const table = new UniverseTable(universe, entries.filter((entry) => entry.universe === universe));
            table.onOpen((entry) => openRow(entry, entries));
            return table;
        }));
    }
}
