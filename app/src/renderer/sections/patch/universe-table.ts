/**
 * Patch table of one universe: a row per fixture, in address order,
 * with number, name, type, mode, addresses, channels and problems.
 * Pressing a row opens the fixture.
 */

import { Component, Emitter, Label, ListItem, Panel, Stack, icon, type Unsubscribe } from '../../../framework/ts/index.js';
import { UNIVERSE_SIZE } from '../../../shared/fixtures/fixture-definition.js';
import { categoryIcon } from '../../fixtures/fixture-icons.js';
import { categoryLabel } from '../../fixtures/fixture-text.js';
import { t, type TextKey } from '../../i18n/i18n.js';
import type { PatchRow } from './patch-rows.js';
import { entryAddresses, entryFixture, entryProblem } from './patch-text.js';

const COLUMNS: readonly TextKey[] = [
    'patch.columnNumber',
    'patch.columnName',
    'patch.columnFixture',
    'patch.columnMode',
    'patch.columnAddress',
    'patch.columnChannels'
];

/**
 * Cell of a row: a label in a column of the table.
 */
function cell(text: string, tone: 'primary' | 'secondary' = 'primary'): Stack {
    return new Stack({ classes: ['patch-table__cell'], children: [new Label({ text, tone, size: 'small' })] });
}

/**
 * Cell with the icon of the fixture type, named for assistive technologies.
 */
function typeCell(entry: PatchRow): Stack {
    const stack = new Stack({ direction: 'row', align: 'center', classes: ['patch-table__cell', 'patch-table__type'] });
    if (entry.matrix !== undefined) {
        stack.element.append(icon('grid-3x3', { label: t('matrix.kind') }));
        stack.element.title = t('matrix.kind');
        return stack;
    }
    const label = entry.category === null ? t('patch.missing') : categoryLabel(entry.category);
    stack.element.append(icon(categoryIcon(entry.category), { label }));
    stack.element.title = label;
    return stack;
}

/**
 * Cell with the problem of a fixture, empty when there is none.
 */
function problemCell(entry: PatchRow): Stack {
    const problem = entryProblem(entry);
    const stack = new Stack({ direction: 'row', gap: 1, align: 'center', classes: ['patch-table__cell', 'patch-table__problem'] });
    if (problem !== null) {
        stack.element.append(icon(entry.missing ? 'circle-help' : 'triangle-alert'));
        stack.append(new Label({ text: problem, size: 'small' }));
        stack.element.classList.add(entry.missing ? 'patch-table__problem--missing' : 'patch-table__problem--conflict');
    }
    return stack;
}

export class UniverseTable extends Panel {
    private readonly presses = new Emitter<PatchRow>();

    constructor(universe: number, entries: readonly PatchRow[]) {
        super({ title: t('patch.universe', { number: universe }), classes: ['patch-universe'] });

        const sorted = [...entries].sort((a, b) => a.address - b.address || a.number - b.number);
        const used = new Set<number>();
        for (const entry of sorted) {
            for (let channel = entry.address; channel < entry.address + entry.channelCount && channel <= UNIVERSE_SIZE; channel++) {
                used.add(channel);
            }
        }

        const header = new Stack({
            direction: 'row',
            classes: ['patch-table__row', 'patch-table__row--header'],
            // The type icon and the problems have no column title
            children: [cell(''), ...COLUMNS.map((key) => cell(t(key), 'secondary')), cell('')]
        });
        this.append(
            new Label({ text: t('patch.universeUsage', { used: used.size }), tone: 'secondary', size: 'small' }),
            header,
            ...sorted.map((entry) => this.row(entry))
        );
        this.track(() => this.presses.clear());
    }

    /**
     * Registers a listener for the rows pressed by the user.
     */
    onOpen(listener: (entry: PatchRow) => void): Unsubscribe {
        return this.presses.subscribe(listener);
    }

    private row(entry: PatchRow): Component {
        const row = new ListItem({
            label: `${entry.number} ${entry.name}`,
            muted: entry.missing,
            classes: ['patch-table__row'],
            children: [
                typeCell(entry),
                cell(String(entry.number)),
                cell(entry.name),
                cell(entryFixture(entry), 'secondary'),
                cell(entry.mode, 'secondary'),
                cell(entryAddresses(entry)),
                cell(String(entry.channelCount), 'secondary'),
                problemCell(entry)
            ]
        });
        row.onPress(() => this.presses.emit(entry));
        return row;
    }
}
