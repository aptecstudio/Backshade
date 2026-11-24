/**
 * Fixture editor: value ranges of a channel (from, to, description,
 * function and wheel color). Returns the edited ranges, or null if cancelled.
 */

import { Dialog, Key, Label, NumberField, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { DMX_MAX, FIXTURE_NAME_MAX_LENGTH, type CapabilityKind, type FixtureCapability } from '../../../shared/fixtures/fixture-definition.js';
import { t, type TextKey } from '../../i18n/i18n.js';
import { capabilityKindOptions } from '../fixture-text.js';

/**
 * Row of a range; it edits the capability object it receives.
 */
function capabilityRow(capability: FixtureCapability, onRemove: () => void): Stack {
    const from = new NumberField({ ariaLabel: t('fixtureEditor.from'), value: capability.from, min: 0, max: DMX_MAX });
    const to = new NumberField({ ariaLabel: t('fixtureEditor.to'), value: capability.to, min: 0, max: DMX_MAX });
    const label = new TextField({ ariaLabel: t('fixtureEditor.label'), value: capability.label, maxLength: FIXTURE_NAME_MAX_LENGTH });
    const kind = new SelectField<CapabilityKind | ''>({ ariaLabel: t('fixtureEditor.kind'), options: capabilityKindOptions(), value: capability.kind ?? '' });
    const remove = new Key({ label: t('fixtureEditor.removeCapability'), icon: 'trash-2', iconOnly: true });

    from.onChange((value) => {
        capability.from = value;
    });
    to.onChange((value) => {
        capability.to = value;
    });
    label.onInput((value) => {
        capability.label = value;
    });
    kind.onChange((value) => {
        if (value === '') {
            delete capability.kind;
        } else {
            capability.kind = value;
        }
    });
    remove.onPress(onRemove);

    return new Stack({ direction: 'row', gap: 1, align: 'center', classes: ['capability-row'], children: [from, to, label, kind, remove] });
}

const COLUMNS: readonly TextKey[] = ['fixtureEditor.from', 'fixtureEditor.to', 'fixtureEditor.label', 'fixtureEditor.kind'];

/**
 * Header of the range columns.
 */
function header(): Stack {
    return new Stack({
        direction: 'row',
        gap: 1,
        classes: ['capability-row', 'capability-row--header'],
        children: COLUMNS.map((key) => new Label({ text: t(key), tone: 'secondary', size: 'small' }))
    });
}

/**
 * Opens the editor of the ranges of a channel.
 */
export function editCapabilities(channelName: string, capabilities: readonly FixtureCapability[]): Promise<FixtureCapability[] | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: t('fixtureEditor.capabilitiesTitle', { name: channelName }), size: 'wide' });
        const working = capabilities.map((capability) => ({ ...capability }));
        const list = new Stack({ gap: 1 });
        let rows: Stack[] = [];

        const render = (): void => {
            rows.forEach((row) => row.destroy());
            rows = working.map((capability) => capabilityRow(capability, () => {
                working.splice(working.indexOf(capability), 1);
                render();
            }));
            list.append(...rows);
        };

        const add = new Key({ label: t('fixtureEditor.addCapability'), icon: 'plus' });
        add.onPress(() => {
            const last = working.reduce((max, capability) => Math.max(max, capability.to), -1);
            const from = Math.min(DMX_MAX, last + 1);
            working.push({ from, to: DMX_MAX, label: '' });
            render();
        });

        dialog.append(new Label({ text: t('fixtureEditor.capabilitiesHint'), tone: 'secondary', size: 'small' }), header(), list, new Stack({ direction: 'row', children: [add] }));
        render();

        const finish = (result: FixtureCapability[] | null): void => {
            dialog.close();
            resolve(result);
        };
        const cancel = new Key({ label: t('common.cancel') });
        const apply = new Key({ label: t('common.apply'), state: 'active' });
        cancel.onPress(() => finish(null));
        apply.onPress(() => finish(working.map((capability) => ({ ...capability, label: capability.label.trim() }))));
        dialog.addActions(cancel, apply);
        dialog.onCancel(() => finish(null));
        dialog.open();
    });
}
