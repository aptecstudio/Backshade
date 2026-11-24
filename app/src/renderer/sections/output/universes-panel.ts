/**
 * Output section: the universes of the show (used by the patch or
 * configured) with their Art-Net destination; pressing a row opens it.
 * A universe without fixtures can be added to send it anyway.
 */

import { Dialog, Key, Label, ListItem, NumberField, Panel, Stack } from '../../../framework/ts/index.js';
import { formatPortAddress, outputUniverse, type OutputUniverse, type ShowOutput } from '../../../shared/output/output-config.js';
import { MAX_UNIVERSE } from '../../../shared/patch/patch.js';
import type { PatchEntry } from '../../../shared/transport/engine-api.js';
import { t, type TextKey } from '../../i18n/i18n.js';
import { openUniverseDialog } from './universe-dialog.js';

const COLUMNS: readonly TextKey[] = ['output.columnUniverse', 'output.columnPortAddress', 'output.columnTransport', 'output.columnFixtures'];

function cell(text: string, tone: 'primary' | 'secondary' = 'primary'): Stack {
    return new Stack({ classes: ['output-table__cell'], children: [new Label({ text, tone, size: 'small' })] });
}

function transportText(destination: OutputUniverse): string {
    if (!destination.enabled) {
        return t('output.disabled');
    }
    if (destination.transport === 'broadcast') {
        return t('output.broadcast');
    }
    return destination.targets.length === 0 ? t('output.unicastNone') : t('output.unicastTargets', { targets: destination.targets.join(', ') });
}

/**
 * Asks the number of a universe to add, then opens its destination.
 */
function addUniverse(output: ShowOutput, suggested: number): void {
    const dialog = new Dialog({ title: t('output.addUniverse') });
    const number = new NumberField({ label: t('output.universeNumber'), value: suggested, min: 1, max: MAX_UNIVERSE });
    dialog.append(number);
    const cancel = new Key({ label: t('common.cancel') });
    const next = new Key({ label: t('common.ok'), state: 'active' });
    cancel.onPress(() => dialog.close());
    next.onPress(() => {
        dialog.close();
        const universe = number.value;
        openUniverseDialog(outputUniverse(output, universe), output.universes.some((item) => item.universe === universe));
    });
    dialog.addActions(cancel, next);
    dialog.onCancel(() => dialog.close());
    dialog.open();
}

export class UniversesPanel extends Panel {
    private readonly list = new Stack({ classes: ['output-table__list'] });
    private rows: Array<ListItem | Label> = [];
    private output: ShowOutput | null = null;
    private entries: readonly PatchEntry[] = [];

    constructor() {
        super({ title: t('output.universes'), classes: ['universes-panel'] });
        const add = new Key({ label: t('output.addUniverse'), icon: 'plus' });
        add.onPress(() => {
            if (this.output !== null) {
                const used = this.universes();
                addUniverse(this.output, used.length === 0 ? 1 : Math.min(MAX_UNIVERSE, Math.max(...used) + 1));
            }
        });
        this.append(
            new Stack({
                direction: 'row',
                classes: ['output-table__row', 'output-table__row--header'],
                children: COLUMNS.map((key) => cell(t(key), 'secondary'))
            }),
            this.list,
            new Stack({ direction: 'row', children: [add] })
        );
    }

    /**
     * Shows the universes of the show.
     */
    show(output: ShowOutput, entries: readonly PatchEntry[]): void {
        this.output = output;
        this.entries = entries;
        this.rows.forEach((row) => row.destroy());
        const universes = this.universes();
        this.rows = universes.length === 0
            ? [new Label({ text: t('output.noUniverses'), tone: 'secondary', size: 'small' })]
            : universes.map((universe) => this.row(output, universe));
        this.list.append(...this.rows);
    }

    /** Universes used by the patch or configured */
    private universes(): number[] {
        const numbers = new Set([...this.entries.map((entry) => entry.universe), ...(this.output?.universes ?? []).map((item) => item.universe)]);
        return [...numbers].sort((a, b) => a - b);
    }

    private row(output: ShowOutput, universe: number): ListItem {
        const destination = outputUniverse(output, universe);
        const fixtures = this.entries.filter((entry) => entry.universe === universe).length;
        const row = new ListItem({
            label: t('output.universeTitle', { number: universe }),
            muted: !destination.enabled,
            classes: ['output-table__row'],
            children: [
                cell(String(universe)),
                cell(`${formatPortAddress(destination.portAddress)} (${destination.portAddress})`),
                cell(transportText(destination), 'secondary'),
                cell(String(fixtures), 'secondary')
            ]
        });
        row.onPress(() => openUniverseDialog(destination, output.universes.some((item) => item.universe === universe)));
        return row;
    }
}
