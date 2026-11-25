/**
 * Fixture selection of the attributes panel: one key per patched fixture,
 * in fixture number order, with the icon of its category. A press adds or
 * removes the fixture; the order of selection is kept, because the first
 * fixture selected gives the channels and values shown by the panel.
 * The selection belongs to this window, like the selection keys of a desk.
 */

import { Emitter, Key, Label, Stack, type Unsubscribe } from '../../../framework/ts/index.js';
import type { PatchEntry } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { categoryIcon } from '../../fixtures/fixture-icons.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

export class FixtureSelector extends Stack {
    private readonly keysRow: Stack;
    private readonly empty: Label;
    private readonly count: Label;
    private readonly clear: Key;
    private readonly changes = new Emitter<string[]>();
    private keys = new Map<string, Key>();
    private entries: PatchEntry[] = [];
    private selection: string[] = [];

    constructor() {
        super({ gap: 1, classes: ['fixture-selector'] });

        this.count = new Label({ text: '', tone: 'secondary', size: 'small' });
        this.clear = new Key({ label: t('attributesPanel.clear'), icon: 'x' });
        this.clear.onPress(() => this.select([]));
        this.empty = new Label({ text: t('attributesPanel.noFixtures'), tone: 'secondary', size: 'small' });
        this.keysRow = new Stack({ direction: 'row', gap: 1, wrap: true, classes: ['fixture-selector__keys'] });

        this.append(
            new Stack({
                direction: 'row',
                gap: 2,
                align: 'center',
                children: [new Label({ text: t('attributesPanel.fixtures'), size: 'small', weight: 'medium' }), this.count, this.clear]
            }),
            this.empty,
            this.keysRow
        );

        this.track(() => this.changes.clear());
        this.track(engine().on('patch.changed', () => void this.load()));
        this.track(engine().on('fixtures.changed', () => void this.load()));
        void this.load();
    }

    /** Selected fixtures, in order of selection */
    get selected(): readonly string[] {
        return this.selection;
    }

    /**
     * Registers a listener for selection changes.
     */
    onChange(listener: (fixtures: string[]) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    private async load(): Promise<void> {
        try {
            this.entries = [...await engine().request('patch.get')].sort((a, b) => a.number - b.number);
        } catch (error) {
            await showError(error);
            return;
        }
        this.keys.forEach((key) => key.destroy());
        this.keys = new Map();
        for (const entry of this.entries) {
            const key = new Key({ label: `${entry.number} ${entry.name}`, icon: categoryIcon(entry.category) });
            key.element.title = entry.missing ? t('attributesPanel.missing') : `${entry.number} ${entry.name}`;
            key.onPress(() => this.toggle(entry.id));
            this.keys.set(entry.id, key);
            this.keysRow.append(key);
        }
        this.empty.element.hidden = this.entries.length > 0;
        // Fixtures removed from the patch leave the selection
        this.select(this.selection.filter((id) => this.keys.has(id)), true);
    }

    private toggle(id: string): void {
        this.select(this.selection.includes(id) ? this.selection.filter((item) => item !== id) : [...this.selection, id]);
    }

    /**
     * Applies a selection and notifies it.
     * @param always - Notifies even when the selection did not change (patch reloaded)
     */
    private select(fixtures: string[], always = false): void {
        const changed = always || fixtures.length !== this.selection.length || fixtures.some((id, index) => id !== this.selection[index]);
        this.selection = fixtures;
        const entries = new Map(this.entries.map((entry) => [entry.id, entry]));
        for (const [id, key] of this.keys) {
            const position = fixtures.indexOf(id);
            key.setArmed(position >= 0);
            // The reference fixture shows the active state, the others stay normal
            key.setState(position === 0 ? 'active' : entries.get(id)?.missing === true ? 'inactive' : 'normal');
        }
        this.count.setText(fixtures.length === 0 ? '' : t('attributesPanel.selected', { count: fixtures.length }));
        this.clear.element.disabled = fixtures.length === 0;
        if (changed) {
            this.changes.emit([...fixtures]);
        }
    }
}
