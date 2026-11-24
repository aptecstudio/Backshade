/**
 * Fixture editor: the modes of the definition, one row each with the
 * name and the channels in DMX order, edited in their own dialog.
 */

import { Key, Label, Panel, Stack, TextField } from '../../../framework/ts/index.js';
import { FIXTURE_NAME_MAX_LENGTH, type FixtureMode } from '../../../shared/fixtures/fixture-definition.js';
import { t } from '../../i18n/i18n.js';
import type { FixtureDraft } from './fixture-draft.js';
import { editModeChannels } from './mode-channels-dialog.js';

export class ModesPanel extends Panel {
    private readonly draft: FixtureDraft;
    private readonly list = new Stack({ gap: 1 });
    private rows: Stack[] = [];

    constructor(draft: FixtureDraft) {
        super({ title: t('fixtureEditor.modes') });
        this.draft = draft;

        const add = new Key({ label: t('fixtureEditor.addMode'), icon: 'plus' });
        add.onPress(() => {
            draft.addMode(t('fixtureEditor.newMode', { number: draft.definition.modes.length + 1 }));
        });
        this.append(this.list, new Stack({ direction: 'row', children: [add] }));
        this.render();
        this.track(draft.onStructureChange(() => this.render()));
    }

    private render(): void {
        this.rows.forEach((row) => row.destroy());
        this.rows = this.draft.definition.modes.map((mode) => this.row(mode));
        this.list.append(...this.rows);
    }

    /**
     * Number and names of the channels of a mode.
     */
    private summary(mode: FixtureMode): string {
        if (mode.channels.length === 0) {
            return t('fixtureEditor.modeEmpty');
        }
        const names = mode.channels.map((key) => this.draft.channel(key)?.name ?? key);
        return t('fixtureEditor.modeSummary', { count: names.length, channels: names.join(', ') });
    }

    private row(mode: FixtureMode): Stack {
        const draft = this.draft;
        const name = new TextField({ ariaLabel: t('fixtureEditor.modeName'), value: mode.name, maxLength: FIXTURE_NAME_MAX_LENGTH });
        const edit = new Key({ label: t('fixtureEditor.editMode'), icon: 'pencil' });
        const remove = new Key({ label: t('fixtureEditor.removeMode'), icon: 'trash-2', iconOnly: true });

        name.onInput((value) => {
            mode.name = value;
        });
        edit.onPress(() => void editModeChannels(mode.name, draft.definition.channels, mode.channels).then((channels) => {
            if (channels !== null) {
                draft.setModeChannels(mode, channels);
            }
        }));
        remove.onPress(() => draft.removeMode(mode));

        return new Stack({
            direction: 'row',
            gap: 1,
            align: 'center',
            classes: ['mode-row'],
            children: [
                name,
                new Stack({ classes: ['mode-row__summary'], children: [new Label({ text: this.summary(mode), tone: 'secondary', size: 'small' })] }),
                edit,
                remove
            ]
        });
    }
}
