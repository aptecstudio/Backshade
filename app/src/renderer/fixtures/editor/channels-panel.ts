/**
 * Fixture editor: the channels of the definition, one row each with
 * name, attribute, coarse channel (for 16-bit values), default value,
 * value ranges and whether the blackout stops it. The rows are rebuilt when the structure changes.
 */

import { Key, Label, NumberField, Panel, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { DMX_MAX, FIXTURE_NAME_MAX_LENGTH, type FixtureAttribute, type FixtureChannel } from '../../../shared/fixtures/fixture-definition.js';
import { t, type TextKey } from '../../i18n/i18n.js';
import { attributeOptions } from '../fixture-text.js';
import { editCapabilities } from './capabilities-dialog.js';
import type { FixtureDraft } from './fixture-draft.js';

const NOT_FINE = '';
const COLUMNS: readonly TextKey[] = [
    'fixtureEditor.channelName',
    'fixtureEditor.attribute',
    'fixtureEditor.fineOf',
    'fixtureEditor.defaultValue',
    'fixtureEditor.capabilities',
    'fixtureEditor.blackout'
];

export class ChannelsPanel extends Panel {
    private readonly draft: FixtureDraft;
    private readonly list = new Stack({ gap: 8 });
    private rows: Stack[] = [];

    constructor(draft: FixtureDraft) {
        super({ title: t('fixtureEditor.channels') });
        this.draft = draft;

        const add = new Key({ label: t('fixtureEditor.addChannel'), icon: 'plus' });
        add.onPress(() => {
            draft.addChannel(t('fixtureEditor.newChannel', { number: draft.definition.channels.length + 1 }));
        });
        this.append(
            new Stack({
                direction: 'row',
                gap: 8,
                classes: ['channel-row', 'channel-row--header'],
                children: COLUMNS.map((key) => new Label({ text: t(key), tone: 'secondary', size: 'small' }))
            }),
            this.list,
            new Stack({ direction: 'row', children: [add] })
        );
        this.render();
        this.track(draft.onStructureChange(() => this.render()));
    }

    private render(): void {
        this.rows.forEach((row) => row.destroy());
        this.rows = this.draft.definition.channels.map((channel) => this.row(channel));
        this.list.append(...this.rows);
    }

    private row(channel: FixtureChannel): Stack {
        const draft = this.draft;
        const name = new TextField({ ariaLabel: t('fixtureEditor.channelName'), value: channel.name, maxLength: FIXTURE_NAME_MAX_LENGTH });
        const attribute = new SelectField<FixtureAttribute>({ ariaLabel: t('fixtureEditor.attribute'), options: attributeOptions(), value: channel.attribute });
        // Only 8 bit channels other than this one can receive a fine channel
        const coarse = draft.definition.channels.filter((other) => other !== channel && other.fineOf === undefined);
        const fineOf = new SelectField<string>({
            ariaLabel: t('fixtureEditor.fineOf'),
            options: [{ value: NOT_FINE, label: t('fixtureEditor.notFine') }, ...coarse.map((other) => ({ value: other.key, label: other.name }))],
            value: channel.fineOf ?? NOT_FINE
        });
        const defaultValue = new NumberField({ ariaLabel: t('fixtureEditor.defaultValue'), value: channel.defaultValue ?? 0, min: 0, max: DMX_MAX });
        const count = channel.capabilities?.length ?? 0;
        const capabilities = new Key({
            label: count === 0 ? t('fixtureEditor.noCapabilities') : t('fixtureEditor.capabilityCount', { count })
        });
        const blackout = new Key({
            label: t(channel.blackout === true ? 'fixtureEditor.blackoutStops' : 'fixtureEditor.blackoutKeeps'),
            state: channel.blackout === true ? 'active' : 'normal'
        });
        blackout.onPress(() => {
            if (channel.blackout === true) {
                delete channel.blackout;
            } else {
                channel.blackout = true;
            }
            blackout.setState(channel.blackout === true ? 'active' : 'normal');
            blackout.setLabel(t(channel.blackout === true ? 'fixtureEditor.blackoutStops' : 'fixtureEditor.blackoutKeeps'));
        });
        const remove = new Key({ label: t('fixtureEditor.removeChannel'), icon: 'trash-2', iconOnly: true });

        name.onInput((value) => {
            channel.name = value;
        });
        attribute.onChange((value) => {
            channel.attribute = value;
        });
        fineOf.onChange((value) => draft.setFineOf(channel.key, value === NOT_FINE ? null : value));
        defaultValue.onChange((value) => {
            if (value === 0) {
                delete channel.defaultValue;
            } else {
                channel.defaultValue = value;
            }
        });
        capabilities.onPress(() => void editCapabilities(channel.name, channel.capabilities ?? []).then((result) => {
            if (result !== null) {
                draft.setCapabilities(channel.key, result);
            }
        }));
        remove.onPress(() => draft.removeChannel(channel.key));

        return new Stack({
            direction: 'row',
            gap: 8,
            align: 'center',
            classes: ['channel-row'],
            children: [name, attribute, fineOf, defaultValue, capabilities, blackout, remove]
        });
    }
}
