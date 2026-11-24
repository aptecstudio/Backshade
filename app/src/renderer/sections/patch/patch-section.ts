/**
 * Patch section: the fixtures of the open show, as a list of tables per
 * universe or as the grid of the 512 channels of a universe, with the
 * keys to add fixtures and to open the fixture library. The chosen view
 * is remembered per device. It updates with the patch.changed event.
 */

import { Key, Label, LocalPreference, Panel, Spacer, Stack, type Component } from '../../../framework/ts/index.js';
import type { PatchEntry } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { openFixtureLibrary } from '../../fixtures/fixture-library-dialog.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { openAddFixtures } from './add-fixtures-dialog.js';
import { PatchGridView } from './patch-grid-view.js';
import { PatchListView } from './patch-list-view.js';

type PatchView = 'list' | 'grid';

const viewPreference = new LocalPreference('backshade.patchView');

export class PatchSection extends Panel {
    private readonly summary: Label;
    private readonly listKey: Key;
    private readonly gridKey: Key;
    private view: PatchView = viewPreference.get() === 'grid' ? 'grid' : 'list';
    private entries: PatchEntry[] = [];
    private content: Component | null = null;
    // Universe of the grid, kept when the patch changes
    private gridUniverse: number | null = null;

    constructor() {
        super({ title: t('patch.title'), classes: ['patch-section'] });

        const add = new Key({ label: t('patch.addFixtures'), icon: 'plus' });
        const library = new Key({ label: t('patch.library'), icon: 'layout-template' });
        add.onPress(() => void openAddFixtures(this.entries, this.targetUniverse()));
        library.onPress(() => openFixtureLibrary());
        this.summary = new Label({ text: '', tone: 'secondary', size: 'small' });

        this.listKey = new Key({ label: t('patch.viewList'), icon: 'list' });
        this.gridKey = new Key({ label: t('patch.viewGrid'), icon: 'grid-3x3' });
        this.listKey.onPress(() => this.setView('list'));
        this.gridKey.onPress(() => this.setView('grid'));
        this.renderKeys();

        this.append(new Stack({
            direction: 'row',
            gap: 2,
            align: 'center',
            children: [add, library, this.summary, new Spacer(), new Stack({ direction: 'row', gap: 1, children: [this.listKey, this.gridKey] })]
        }));

        void this.load();
        this.track(engine().on('patch.changed', () => void this.load()));
    }

    /**
     * Universe proposed for new fixtures: the one shown in the grid, otherwise the highest in use.
     */
    private targetUniverse(): number {
        if (this.content instanceof PatchGridView) {
            return this.content.current;
        }
        return this.entries.reduce((max, entry) => Math.max(max, entry.universe), 1);
    }

    private setView(view: PatchView): void {
        if (view === this.view) {
            return;
        }
        this.view = view;
        viewPreference.set(view);
        this.renderKeys();
        this.render();
    }

    private renderKeys(): void {
        this.listKey.setState(this.view === 'list' ? 'active' : 'normal');
        this.gridKey.setState(this.view === 'grid' ? 'active' : 'normal');
    }

    private async load(): Promise<void> {
        try {
            this.entries = await engine().request('patch.get');
        } catch (error) {
            await showError(error);
            return;
        }
        const universes = new Set(this.entries.map((entry) => entry.universe)).size;
        this.summary.setText(this.entries.length === 0 ? '' : t('patch.summary', { count: this.entries.length, universes }));
        this.render();
    }

    private render(): void {
        if (this.content instanceof PatchGridView) {
            this.gridUniverse = this.content.current;
        }
        this.content?.destroy();
        if (this.view === 'grid') {
            this.content = new PatchGridView(this.entries, this.gridUniverse ?? this.entries[0]?.universe ?? 1);
        } else if (this.entries.length === 0) {
            this.content = new Label({ text: t('patch.empty'), tone: 'secondary' });
        } else {
            this.content = new PatchListView(this.entries);
        }
        this.append(this.content);
    }
}
