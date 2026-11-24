/**
 * List view of the patch: one table per universe in use.
 */

import { Stack } from '../../../framework/ts/index.js';
import type { PatchEntry } from '../../../shared/transport/engine-api.js';
import { openEditFixture } from './edit-fixture-dialog.js';
import { UniverseTable } from './universe-table.js';

export class PatchListView extends Stack {
    constructor(entries: readonly PatchEntry[]) {
        super({ gap: 2 });
        const universes = [...new Set(entries.map((entry) => entry.universe))].sort((a, b) => a - b);
        this.append(...universes.map((universe) => {
            const table = new UniverseTable(universe, entries.filter((entry) => entry.universe === universe));
            table.onOpen((entry) => void openEditFixture(entry));
            return table;
        }));
    }
}
