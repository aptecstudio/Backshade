/**
 * Grid section: the virtual console of the show. Page keys choose the
 * page (remembered per device); in run mode the widgets work, in edit mode
 * widgets are added, changed, moved and resized, and pages are added,
 * changed and deleted. Every change is saved in the show by the engine.
 */

import { Key, Label, LocalPreference, Panel, Spacer, Stack } from '../../../framework/ts/index.js';
import { GRID_LIMITS, WIDGET_SIZES, type GridPage, type GridWidget, type ShowGrid } from '../../../shared/grid/grid.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { resetGroupLayouts } from './group-attributes.js';
import { GridPageView } from './grid-page-view.js';
import { GridStore } from './grid-store.js';
import { openPageDialog } from './page-dialog.js';
import { openWidgetDialog } from './widget-dialog.js';

const pagePreference = new LocalPreference('backshade.gridPage');

const newId = (): string => crypto.randomUUID();

export class GridSection extends Panel {
    private readonly store = new GridStore();
    private readonly pageKeys = new Stack({ direction: 'row', gap: 1, wrap: true });
    private readonly editKey: Key;
    private readonly addPage: Key;
    private readonly pageSettings: Key;
    private readonly empty: Label;
    private readonly holder = new Stack({ classes: ['grid-section__page'] });
    private keys: Key[] = [];
    private view: GridPageView | null = null;
    private grid: ShowGrid = { pages: [] };
    private pageId: string | null = pagePreference.get();
    private editing = false;
    private frame = 0;

    constructor() {
        super({ classes: ['grid-section'] });
        this.editKey = new Key({ label: t('grid.edit'), icon: 'pencil' });
        this.addPage = new Key({ label: t('grid.addPage'), icon: 'plus' });
        this.pageSettings = new Key({ label: t('grid.pageSettings'), icon: 'settings' });
        this.editKey.onPress(() => this.setEditing(!this.editing));
        this.addPage.onPress(() => void this.createPage());
        this.pageSettings.onPress(() => void this.changePage());
        this.empty = new Label({ text: t('grid.empty'), tone: 'secondary' });

        this.append(
            new Stack({ direction: 'row', gap: 2, align: 'center', wrap: true, children: [this.pageKeys, new Spacer(), this.addPage, this.pageSettings, this.editKey] }),
            this.empty,
            this.holder
        );
        this.track(this.store.onChange(() => this.scheduleRefresh()));
        this.track(() => {
            cancelAnimationFrame(this.frame);
            this.store.dispose();
        });
        this.track(engine().on('grid.changed', () => void this.load()));
        this.track(engine().on('patch.changed', () => resetGroupLayouts()));
        this.setEditing(false);
        void this.load();
    }

    private get page(): GridPage | null {
        return this.grid.pages.find((page) => page.id === this.pageId) ?? this.grid.pages[0] ?? null;
    }

    private async load(): Promise<void> {
        try {
            this.grid = await engine().request('grid.get');
        } catch (error) {
            await showError(error);
            return;
        }
        this.render();
    }

    private async save(grid: ShowGrid): Promise<void> {
        try {
            this.grid = await engine().request('grid.set', { grid });
            this.render();
        } catch (error) {
            await showError(error);
        }
    }

    private setEditing(editing: boolean): void {
        this.editing = editing;
        this.editKey.setState(editing ? 'active' : 'normal');
        this.editKey.setArmed(editing);
        this.render();
    }

    private render(): void {
        const page = this.page;
        this.pageId = page?.id ?? null;
        this.keys.forEach((key) => key.destroy());
        this.keys = this.grid.pages.map((item) => {
            const key = new Key({ label: item.name, state: item.id === page?.id ? 'active' : 'normal' });
            key.onPress(() => {
                this.pageId = item.id;
                pagePreference.set(item.id);
                this.render();
            });
            return key;
        });
        this.pageKeys.append(...this.keys);
        this.addPage.element.hidden = !this.editing && this.grid.pages.length > 0;
        this.addPage.setDisabled(this.grid.pages.length >= GRID_LIMITS.pages);
        this.pageSettings.element.hidden = !this.editing || page === null;
        this.editKey.element.hidden = page === null;
        this.empty.element.hidden = page !== null;

        this.view?.destroy();
        this.view = null;
        if (page === null) {
            return;
        }
        const view = new GridPageView(page, this.store, this.editing);
        view.onAdd((cell) => void this.addWidget(page, cell.x, cell.y));
        view.onEdit((widget) => void this.editWidget(page, widget));
        view.onPlace((placement) => void this.updateWidget(page, { ...placement.widget, x: placement.x, y: placement.y, w: placement.w, h: placement.h }));
        this.view = view;
        this.holder.append(view);
    }

    /** Refreshes the widgets at most once per frame */
    private scheduleRefresh(): void {
        if (this.frame !== 0) {
            return;
        }
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.view?.refresh();
        });
    }

    private withPage(page: GridPage, change: (page: GridPage) => GridPage | null): ShowGrid {
        return { pages: this.grid.pages.flatMap((item) => {
            if (item.id !== page.id) {
                return [item];
            }
            const next = change(item);
            return next === null ? [] : [next];
        }) };
    }

    private async createPage(): Promise<void> {
        const result = await openPageDialog(null, t('grid.defaultPageName', { number: this.grid.pages.length + 1 }));
        if (result?.action === 'save') {
            const page: GridPage = { id: newId(), name: result.name, columns: result.columns, rows: result.rows, widgets: [] };
            this.pageId = page.id;
            pagePreference.set(page.id);
            this.editing = true;
            this.editKey.setState('active');
            this.editKey.setArmed(true);
            await this.save({ pages: [...this.grid.pages, page] });
        }
    }

    private async changePage(): Promise<void> {
        const page = this.page;
        if (page === null) {
            return;
        }
        const result = await openPageDialog(page, page.name);
        if (result === null) {
            return;
        }
        if (result.action === 'delete') {
            this.pageId = null;
            await this.save(this.withPage(page, () => null));
            return;
        }
        // Widgets that no longer fit are moved inside the new size
        const widgets = page.widgets.map((widget) => {
            const w = Math.min(widget.w, result.columns);
            const h = Math.min(widget.h, result.rows);
            return { ...widget, w, h, x: Math.min(widget.x, result.columns - w), y: Math.min(widget.y, result.rows - h) };
        });
        await this.save(this.withPage(page, (item) => ({ ...item, name: result.name, columns: result.columns, rows: result.rows, widgets })));
    }

    private async addWidget(page: GridPage, x: number, y: number): Promise<void> {
        const size = WIDGET_SIZES.key;
        const draft: GridWidget = { id: newId(), type: 'key', x, y, w: Math.min(size.w, page.columns - x), h: Math.min(size.h, page.rows - y), label: '', link: { kind: 'none' } };
        const result = await openWidgetDialog(draft, true, page, this.store);
        if (result?.action === 'save') {
            await this.save(this.withPage(page, (item) => ({ ...item, widgets: [...item.widgets, result.widget] })));
        }
    }

    private async editWidget(page: GridPage, widget: GridWidget): Promise<void> {
        const result = await openWidgetDialog(widget, false, page, this.store);
        if (result?.action === 'delete') {
            await this.save(this.withPage(page, (item) => ({ ...item, widgets: item.widgets.filter((other) => other.id !== widget.id) })));
        } else if (result?.action === 'save') {
            await this.updateWidget(page, result.widget);
        }
    }

    private async updateWidget(page: GridPage, widget: GridWidget): Promise<void> {
        await this.save(this.withPage(page, (item) => ({ ...item, widgets: item.widgets.map((other) => other.id === widget.id ? widget : other) })));
    }
}
