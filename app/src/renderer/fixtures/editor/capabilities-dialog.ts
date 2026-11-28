/**
 * Fixture editor: value ranges of a channel (from, to, description,
 * function, mask of a gobo and facets of a prism). Returns the edited
 * ranges, or null if cancelled.
 */

import { Dialog, ImageView, Key, Label, NumberField, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { DMX_MAX, FIXTURE_NAME_MAX_LENGTH, PRISM_FACETS, type CapabilityKind, type FixtureCapability } from '../../../shared/fixtures/fixture-definition.js';
import { showError } from '../../dialogs/show-error.js';
import { pickFiles } from '../../files/file-dialogs.js';
import { t, type TextKey } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { capabilityKindOptions } from '../fixture-text.js';
import { makeMask } from './gobo-mask.js';
import { GOBO_PRESETS, presetMask, type GoboPreset } from './gobo-presets.js';

/** Chooses an image with the file manager and keeps it as the mask of the range */
async function chooseMask(capability: FixtureCapability, onChange: () => void): Promise<void> {
    const [file] = await pickFiles(t('fixtureEditor.chooseMask'), (entry) => entry.kind === 'image' && !entry.name.toLowerCase().endsWith('.svg'), false);
    if (file === undefined) {
        return;
    }
    try {
        capability.image = await makeMask(await engine().request('fixtures.readImage', { file }));
        onChange();
    } catch (error) {
        await showError(error);
    }
}

/** Tells that the gobo or the prism shakes in this range, slow to fast */
function shakeKey(capability: FixtureCapability, onChange: () => void): Key {
    const key = new Key({ label: t('fixtureEditor.shake'), state: capability.shake === true ? 'active' : 'normal' });
    key.onPress(() => {
        if (capability.shake === true) {
            delete capability.shake;
        } else {
            capability.shake = true;
        }
        onChange();
    });
    return key;
}

/** What a gobo or a prism needs besides its function */
function extraFields(capability: FixtureCapability, onChange: () => void): Stack {
    const extra = new Stack({ direction: 'row', gap: 8, align: 'center', classes: ['capability-row__extra'] });
    if (capability.kind === 'gobo') {
        if (capability.image !== undefined) {
            const remove = new Key({ label: t('fixtureEditor.removeMask'), icon: 'trash-2', iconOnly: true });
            remove.onPress(() => {
                delete capability.image;
                onChange();
            });
            extra.append(new ImageView({ src: capability.image, alt: t('fixtureEditor.mask') }), remove);
        }
        const ready = new SelectField<GoboPreset | ''>({
            ariaLabel: t('fixtureEditor.readyMask'),
            options: [{ value: '', label: t('fixtureEditor.readyMask') }, ...GOBO_PRESETS.map((value) => ({ value, label: t(`fixtureEditor.goboPresets.${value}`) }))],
            value: ''
        });
        ready.onChange((preset) => {
            if (preset !== '') {
                capability.image = presetMask(preset);
                onChange();
            }
        });
        const choose = new Key({ label: t('fixtureEditor.chooseMask') });
        choose.onPress(() => void chooseMask(capability, onChange));
        extra.append(ready, choose, shakeKey(capability, onChange));
    } else if (capability.kind === 'prism') {
        const facets = new NumberField({ ariaLabel: t('fixtureEditor.facets'), unit: t('fixtureEditor.facets'), value: capability.facets ?? 3, ...PRISM_FACETS });
        facets.onChange((value) => {
            capability.facets = value;
        });
        extra.append(facets, shakeKey(capability, onChange));
    }
    return extra;
}

/**
 * Row of a range; it edits the capability object it receives.
 */
function capabilityRow(capability: FixtureCapability, onRemove: () => void, onChange: () => void): Stack {
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
        onChange();
    });
    remove.onPress(onRemove);

    return new Stack({ direction: 'row', gap: 8, align: 'center', classes: ['capability-row'], children: [from, to, label, kind, extraFields(capability, onChange), remove] });
}

const COLUMNS: readonly TextKey[] = ['fixtureEditor.from', 'fixtureEditor.to', 'fixtureEditor.label', 'fixtureEditor.kind', 'fixtureEditor.gobo'];

/**
 * Header of the range columns.
 */
function header(): Stack {
    return new Stack({
        direction: 'row',
        gap: 8,
        classes: ['capability-row', 'capability-row--header'],
        children: COLUMNS.map((key) => new Label({ text: t(key), tone: 'secondary', size: 'small' }))
    });
}

/**
 * Opens the editor of the ranges of a channel.
 */
export function editCapabilities(channelName: string, capabilities: readonly FixtureCapability[]): Promise<FixtureCapability[] | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: t('fixtureEditor.capabilitiesTitle', { name: channelName }), size: 'large' });
        const working = capabilities.map((capability) => ({ ...capability }));
        const list = new Stack({ gap: 8 });
        let rows: Stack[] = [];

        const render = (): void => {
            rows.forEach((row) => row.destroy());
            rows = working.map((capability) => capabilityRow(capability, () => {
                working.splice(working.indexOf(capability), 1);
                render();
            }, render));
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
