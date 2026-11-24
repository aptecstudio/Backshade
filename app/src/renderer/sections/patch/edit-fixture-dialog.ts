/**
 * Changes a patched fixture: name, number, universe, start address and
 * mode, or removes it from the patch. Without its definition the mode
 * cannot be changed.
 */

import { Dialog, Key, Label, NumberField, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { UNIVERSE_SIZE } from '../../../shared/fixtures/fixture-definition.js';
import { MAX_FIXTURE_NUMBER, MAX_UNIVERSE } from '../../../shared/patch/patch.js';
import type { FixtureModeSummary, PatchEntry } from '../../../shared/transport/engine-api.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { entryFixture } from './patch-text.js';

/**
 * Modes of the definition of a fixture; only its own mode if the definition is missing.
 */
async function modesOf(entry: PatchEntry): Promise<FixtureModeSummary[]> {
    if (entry.manufacturer === null) {
        return [{ name: entry.mode, channelCount: entry.channelCount }];
    }
    try {
        return (await engine().request('fixtures.get', { id: entry.definition })).modes;
    } catch {
        return [{ name: entry.mode, channelCount: entry.channelCount }];
    }
}

/**
 * Asks to confirm and removes the fixture; returns true if it was removed.
 */
async function removeEntry(entry: PatchEntry): Promise<boolean> {
    const choice = await askChoice(t('patch.removeTitle'), t('patch.removeConfirm', { name: entry.name }), [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'remove', label: t('patch.remove'), destructive: true, primary: true }
    ]);
    if (choice !== 'remove') {
        return false;
    }
    try {
        await engine().request('patch.remove', { ids: [entry.id] });
        return true;
    } catch (error) {
        await showError(error);
        return false;
    }
}

/**
 * Opens the dialog of a fixture.
 */
export async function openEditFixture(entry: PatchEntry): Promise<void> {
    const modes = await modesOf(entry);
    const dialog = new Dialog({ title: t('patch.editTitle') });

    const name = new TextField({ label: t('patch.name'), value: entry.name, maxLength: 100 });
    const number = new NumberField({ label: t('patch.columnNumber'), value: entry.number, min: 1, max: MAX_FIXTURE_NUMBER });
    const universe = new NumberField({ label: t('patch.universeField'), value: entry.universe, min: 1, max: MAX_UNIVERSE });
    const address = new NumberField({ label: t('patch.address'), value: entry.address, min: 1, max: UNIVERSE_SIZE });
    const mode = new SelectField<string>({
        label: t('patch.mode'),
        options: modes.map((item) => ({ value: item.name, label: `${item.name} (${t('fixtures.channelCount', { count: item.channelCount })})` })),
        value: entry.mode
    });
    mode.setDisabled(entry.missing);
    const note = new Label({ text: t('patch.modeChangeNote'), tone: 'secondary', size: 'small' });
    note.element.hidden = true;
    mode.onChange((value) => {
        note.element.hidden = modes.find((item) => item.name === value)?.channelCount === entry.channelCount;
    });

    dialog.append(
        new Label({ text: entryFixture(entry), tone: 'secondary' }),
        name,
        new Stack({ direction: 'row', gap: 2, wrap: true, children: [number, universe, address] }),
        mode,
        note
    );

    const apply = async (): Promise<void> => {
        try {
            await engine().request('patch.update', {
                id: entry.id,
                name: name.value,
                number: number.value,
                universe: universe.value,
                address: address.value,
                ...(entry.missing ? {} : { mode: mode.value })
            });
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };

    const remove = new Key({ label: t('patch.remove'), icon: 'trash-2', armed: true });
    const cancel = new Key({ label: t('common.cancel') });
    const applyKey = new Key({ label: t('common.apply'), state: 'active' });
    remove.onPress(() => void removeEntry(entry).then((removed) => {
        if (removed) {
            dialog.close();
        }
    }));
    cancel.onPress(() => dialog.close());
    applyKey.onPress(() => void apply());
    dialog.addActions(remove, cancel, applyKey);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    name.focus();
}
