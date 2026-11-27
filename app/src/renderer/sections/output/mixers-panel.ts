/**
 * Output section: external audio mixers of the show, with their model and
 * address; pressing a row changes the mixer. Their scenes are recalled by
 * the scenes of the console, the cues and the mixer tracks of the timelines.
 */

import { Key, Label, ListItem, Panel, Stack } from '../../../framework/ts/index.js';
import type { ShowMixer } from '../../../shared/mixers/mixers.js';
import { showError } from '../../dialogs/show-error.js';
import { t, type TextKey } from '../../i18n/i18n.js';
import { canEdit, markEdit } from '../../show/edit-access.js';
import { engine } from '../../transport/engine.js';
import { mixerModelLabel, openMixerDialog } from './mixer-dialog.js';

const COLUMNS: readonly TextKey[] = ['patch.name', 'mixers.model', 'mixers.host'];

function cell(text: string, tone: 'primary' | 'secondary' = 'primary'): Stack {
    return new Stack({ classes: ['output-table__cell'], children: [new Label({ text, tone, size: 'small' })] });
}

export class MixersPanel extends Panel {
    private readonly list = new Stack({ classes: ['output-table__list'] });
    private readonly empty = new Label({ text: t('mixers.empty'), tone: 'secondary', size: 'small' });
    private rows: ListItem[] = [];
    private mixers: ShowMixer[] = [];

    constructor() {
        super({ title: t('mixers.panel'), classes: ['mixers-panel'] });
        const add = new Key({ label: t('mixers.add'), icon: 'plus' });
        markEdit(add);
        add.onPress(() => openMixerDialog(null, this.mixers.length + 1));
        this.append(
            new Label({ text: t('mixers.hint'), tone: 'secondary', size: 'small' }),
            new Stack({
                direction: 'row',
                classes: ['output-table__row', 'output-table__row--header', 'mixer-table__row'],
                children: COLUMNS.map((key) => cell(t(key), 'secondary'))
            }),
            this.list,
            this.empty,
            new Stack({ direction: 'row', children: [add] })
        );
        this.track(engine().on('mixers.changed', () => void this.load()));
        void this.load();
    }

    private async load(): Promise<void> {
        try {
            this.mixers = (await engine().request('mixers.get')).mixers;
        } catch (error) {
            await showError(error);
            return;
        }
        this.rows.forEach((row) => row.destroy());
        this.rows = this.mixers.map((mixer) => {
            const row = new ListItem({
                label: `${mixer.name}, ${mixerModelLabel(mixer.model)}`,
                classes: ['output-table__row', 'mixer-table__row'],
                children: [
                    cell(mixer.name),
                    cell(mixerModelLabel(mixer.model), 'secondary'),
                    cell(mixer.host === '' ? t('mixers.noHost') : `${mixer.host}:${mixer.port}`, 'secondary')
                ]
            });
            row.onPress(() => {
                if (canEdit('output')) {
                    openMixerDialog(mixer, this.mixers.length + 1);
                }
            });
            return row;
        });
        this.list.append(...this.rows);
        this.empty.element.hidden = this.mixers.length > 0;
    }
}
