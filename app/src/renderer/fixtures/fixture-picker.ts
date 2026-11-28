/**
 * List of the library definitions with search and category filter;
 * one definition can be selected. Used by the library and by the
 * dialog that adds fixtures to the patch.
 */

import { Component, Emitter, Label, ListItem, SelectField, Stack, TextField, create, icon, type Unsubscribe } from '../../framework/ts/index.js';
import type { FixtureCategory } from '../../shared/fixtures/fixture-definition.js';
import type { FixtureSummary } from '../../shared/transport/engine-api.js';
import { t } from '../i18n/i18n.js';
import { categoryIcon } from './fixture-icons.js';
import { categoryOptions, fixtureDetails, fixtureTitle, matchesSearch, sourceLabel } from './fixture-text.js';

type CategoryFilter = FixtureCategory | 'all';

export class FixturePicker extends Component<HTMLDivElement> {
    private readonly list: HTMLDivElement;
    private readonly count: Label;
    private readonly search: TextField;
    private readonly category: SelectField<CategoryFilter>;
    private readonly selections = new Emitter<FixtureSummary | null>();
    private fixtures: FixtureSummary[] = [];
    private rows: ListItem[] = [];
    private selectedId: string | null = null;

    constructor() {
        super(create('div', { classes: ['fixture-picker'] }));

        this.search = new TextField({ label: t('fixtures.search'), maxLength: 100 });
        this.category = new SelectField<CategoryFilter>({
            label: t('fixtures.category'),
            options: [{ value: 'all', label: t('fixtures.allCategories') }, ...categoryOptions()],
            value: 'all'
        });
        this.count = new Label({ text: '', tone: 'secondary', size: 'small' });
        this.list = create('div', { classes: ['fixture-picker__list'], attributes: { role: 'list' } });

        this.append(new Stack({ direction: 'row', gap: 8, classes: ['fixture-picker__filters'], children: [this.search, this.category] }), this.count);
        this.element.append(this.list);

        this.track(this.search.onInput(() => this.render()));
        this.track(this.category.onChange(() => this.render()));
        this.track(() => this.selections.clear());
    }

    /** Selected definition, or null */
    get selected(): FixtureSummary | null {
        return this.fixtures.find((fixture) => fixture.id === this.selectedId) ?? null;
    }

    /**
     * Replaces the definitions and keeps the selection when possible.
     */
    setFixtures(fixtures: readonly FixtureSummary[], selectId: string | null = this.selectedId): void {
        this.fixtures = [...fixtures];
        this.selectedId = fixtures.some((fixture) => fixture.id === selectId) ? selectId : null;
        this.render();
        this.selections.emit(this.selected);
    }

    /**
     * Moves the focus to the search field.
     */
    focus(): void {
        this.search.focus();
    }

    /**
     * Registers a listener for the selection changes.
     */
    onSelect(listener: (fixture: FixtureSummary | null) => void): Unsubscribe {
        return this.selections.subscribe(listener);
    }

    private render(): void {
        const category = this.category.value;
        const visible = this.fixtures.filter((fixture) =>
            (category === 'all' || fixture.category === category) && matchesSearch(fixture, this.search.value));

        this.rows.forEach((row) => row.destroy());
        this.rows = visible.map((fixture) => this.row(fixture));
        for (const row of this.rows) {
            this.adopt(row);
            this.list.append(row.element);
        }
        this.count.setText(visible.length === 0 ? t('fixtures.noResults') : t('fixtures.count', { count: visible.length }));
    }

    private row(fixture: FixtureSummary): ListItem {
        const row = new ListItem({
            label: fixtureTitle(fixture),
            children: [
                new Stack({
                    gap: 8,
                    classes: ['fixture-picker__text'],
                    children: [
                        new Label({ text: fixtureTitle(fixture), weight: 'medium' }),
                        new Label({ text: `${fixtureDetails(fixture)}, ${sourceLabel(fixture)}`, tone: 'secondary', size: 'small' })
                    ]
                })
            ]
        });
        row.element.prepend(icon(categoryIcon(fixture.category), { classes: ['icon--large', 'fixture-picker__icon'] }));
        row.setSelected(fixture.id === this.selectedId);
        row.onPress(() => {
            this.selectedId = fixture.id;
            this.rows.forEach((item) => item.setSelected(item === row));
            this.selections.emit(fixture);
        });
        return row;
    }
}
