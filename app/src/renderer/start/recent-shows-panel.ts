/**
 * Recent shows on the start page: name, last save date
 * and folder; one click opens the show. Moved or deleted shows are
 * marked and can be removed from the list.
 */

import { icon, Key, Label, ListItem, Panel, Stack, type Component } from '../../framework/ts/index.js';
import type { RecentShow } from '../../shared/transport/engine-api.js';
import { formatDateTime } from '../i18n/format-date.js';
import { t } from '../i18n/i18n.js';
import { openRecent } from '../show/show-commands.js';
import { currentShow, onShowChange } from '../show/show-store.js';
import { engine } from '../transport/engine.js';

export class RecentShowsPanel extends Panel {
    private rows: Component[] = [];

    constructor() {
        super({ title: t('start.recent'), classes: ['recent-shows'] });

        void this.load();
        this.track(engine().on('recent.changed', () => void this.load()));
        this.track(onShowChange(() => void this.load()));
    }

    private async load(): Promise<void> {
        const shows = await engine().request('recent.list');
        this.rows.forEach((row) => row.destroy());
        this.rows = shows.length === 0
            ? [new Label({ text: t('start.noRecent'), tone: 'secondary' })]
            : shows.map((show) => this.row(show));
        this.append(...this.rows);
    }

    private row(show: RecentShow): Component {
        const details = show.missing
            ? t('start.missing')
            : t('start.modified', { date: formatDateTime(show.modifiedAt ?? show.openedAt) });
        const item = new ListItem({
            muted: show.missing,
            label: show.name,
            children: [new Stack({
                gap: 1,
                classes: ['recent-shows__text'],
                children: [
                    new Label({ text: show.name, weight: 'medium' }),
                    new Label({ text: details, tone: show.missing ? 'accent' : 'secondary', size: 'small' }),
                    new Label({ text: show.folder, tone: 'secondary', size: 'small' })
                ]
            })]
        });
        if (show.missing) {
            item.element.prepend(icon('triangle-alert'));
        }
        item.setSelected(currentShow()?.folder === show.folder);
        if (!show.missing) {
            item.onPress(() => void openRecent(show.folder));
        }

        const remove = new Key({ label: t('start.removeRecent'), icon: 'x', iconOnly: true });
        remove.onPress(() => void engine().request('recent.remove', { folder: show.folder }));

        return new Stack({ direction: 'row', gap: 1, align: 'center', classes: ['recent-shows__row'], children: [item, remove] });
    }
}
