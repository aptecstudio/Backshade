/**
 * Grid view of the patch: choice of the universe (the ones in use as
 * keys, any other one by number) and the grid of its 512 channels.
 */

import { Key, Label, NumberField, Panel, Stack } from '../../../framework/ts/index.js';
import { MAX_UNIVERSE } from '../../../shared/patch/patch.js';
import { t } from '../../i18n/i18n.js';
import { openAddFixtures } from './add-fixtures-dialog.js';
import { openRow } from './open-row.js';
import type { PatchRow } from './patch-rows.js';
import { UniverseGrid } from './universe-grid.js';

export class PatchGridView extends Panel {
    private readonly entries: readonly PatchRow[];
    private readonly universeKeys = new Stack({ direction: 'row', gap: 8, wrap: true });
    private readonly universeField: NumberField;
    private readonly usage = new Label({ text: '', tone: 'secondary', size: 'small' });
    private keys: Key[] = [];
    private grid: UniverseGrid | null = null;
    private universe: number;

    /**
     * @param universe - Universe shown first
     */
    constructor(entries: readonly PatchRow[], universe: number) {
        super({ classes: ['patch-grid'] });
        this.entries = entries;
        this.universe = universe;

        this.universeField = new NumberField({ label: t('patch.universeField'), value: universe, min: 1, max: MAX_UNIVERSE });
        this.universeField.onChange((value) => this.show(value));
        this.append(
            new Stack({ direction: 'row', gap: 8, align: 'end', wrap: true, children: [this.universeField, this.universeKeys] }),
            this.usage
        );
        this.show(universe);
    }

    /** Universe shown */
    get current(): number {
        return this.universe;
    }

    private show(universe: number): void {
        this.universe = universe;
        this.universeField.setValue(universe);

        // Universes in use, plus the one shown when it is still empty
        const universes = [...new Set([...this.entries.map((entry) => entry.universe), universe])].sort((a, b) => a - b);
        this.keys.forEach((key) => key.destroy());
        this.keys = universes.map((number) => {
            const key = new Key({ label: t('patch.universe', { number }), state: number === universe ? 'active' : 'normal' });
            key.onPress(() => this.show(number));
            return key;
        });
        this.universeKeys.append(...this.keys);

        const entries = this.entries.filter((entry) => entry.universe === universe);
        const used = new Set(entries.flatMap((entry) => Array.from({ length: entry.channelCount }, (_, index) => entry.address + index)));
        this.usage.setText(t('patch.universeUsage', { used: used.size }));

        this.grid?.destroy();
        this.grid = new UniverseGrid(entries);
        this.grid.onOpen((entry) => openRow(entry, this.entries));
        this.grid.onFree((address) => void openAddFixtures(this.entries, universe, address));
        this.append(this.grid);
    }
}
