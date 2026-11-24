/**
 * Adds fixtures to the patch: choice of the definition from the library,
 * mode, quantity, universe, start address, first number and name. The
 * first free address and number are suggested whenever the choice changes.
 */

import { Dialog, Key, Label, NumberField, Panel, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { UNIVERSE_SIZE } from '../../../shared/fixtures/fixture-definition.js';
import { findFreeAddress, findFreeNumber } from '../../../shared/patch/address-map.js';
import { MAX_FIXTURE_NUMBER, MAX_FIXTURES_PER_ADD, MAX_UNIVERSE } from '../../../shared/patch/patch.js';
import type { FixtureSummary, PatchEntry } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { FixturePicker } from '../../fixtures/fixture-picker.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

/**
 * Opens the dialog.
 * @param entries - Fixtures already in the patch, for the free addresses and numbers
 * @param universe - Universe proposed for the new fixtures
 * @param from - Address chosen in the grid: the first free one from here is proposed
 */
export async function openAddFixtures(entries: readonly PatchEntry[], universe = 1, from = 1): Promise<void> {
    let fixtures: FixtureSummary[];
    try {
        fixtures = await engine().request('fixtures.list');
    } catch (error) {
        await showError(error);
        return;
    }

    const dialog = new Dialog({ title: t('patch.addTitle'), size: 'large' });
    const picker = new FixturePicker();
    const hint = new Label({ text: t('patch.chooseFixture'), tone: 'secondary' });
    const mode = new SelectField<string>({ label: t('patch.mode'), options: [], value: '' });
    const count = new NumberField({ label: t('patch.count'), value: 1, min: 1, max: MAX_FIXTURES_PER_ADD });
    const universeField = new NumberField({ label: t('patch.universeField'), value: universe, min: 1, max: MAX_UNIVERSE });
    const address = new NumberField({ label: t('patch.address'), value: from, min: 1, max: UNIVERSE_SIZE });
    const number = new NumberField({ label: t('patch.number'), value: findFreeNumber(entries), min: 1, max: MAX_FIXTURE_NUMBER });
    const name = new TextField({ label: t('patch.name'), maxLength: 100 });
    const placement = new Label({ text: '', tone: 'secondary', size: 'small' });
    const firstFree = new Key({ label: t('patch.firstFree') });
    const add = new Key({ label: t('patch.add'), state: 'active' });

    const form = new Stack({
        gap: 2,
        children: [
            mode,
            new Stack({ direction: 'row', gap: 2, wrap: true, children: [count, universeField, address, number] }),
            name,
            placement,
            new Stack({ direction: 'row', children: [firstFree] })
        ]
    });
    const side = new Panel({ classes: ['add-fixtures__form'] });
    side.append(hint, form);
    dialog.append(new Stack({ direction: 'row', gap: 2, align: 'stretch', classes: ['fixture-library'], children: [picker, side] }));

    const channelCount = (): number =>
        picker.selected?.modes.find((item) => item.name === mode.value)?.channelCount ?? 0;

    // Shows the addresses the fixtures will take
    const describe = (): void => {
        const channels = channelCount();
        if (channels === 0) {
            placement.setText('');
            return;
        }
        const last = address.value + channels * count.value - 1;
        placement.setText(last > UNIVERSE_SIZE
            ? t('patch.noRoom', { universe: universeField.value })
            : t('patch.placement', { count: channels, first: address.value, last }));
        add.setDisabled(last > UNIVERSE_SIZE);
    };

    const suggestAddress = (): void => {
        const channels = channelCount();
        if (channels === 0) {
            return;
        }
        const free = findFreeAddress(entries, universeField.value, channels, count.value, from)
            ?? findFreeAddress(entries, universeField.value, channels, count.value);
        if (free !== null) {
            address.setValue(free);
        }
        describe();
    };

    const select = (fixture: FixtureSummary | null): void => {
        hint.element.hidden = fixture !== null;
        form.element.hidden = fixture === null;
        add.setDisabled(fixture === null);
        if (fixture === null) {
            return;
        }
        // The mode with most channels is usually the complete one
        const preferred = [...fixture.modes].sort((a, b) => b.channelCount - a.channelCount)[0];
        mode.setOptions(fixture.modes.map((item) => ({ value: item.name, label: `${item.name} (${t('fixtures.channelCount', { count: item.channelCount })})` })), preferred.name);
        name.setValue(fixture.model);
        suggestAddress();
    };

    picker.onSelect(select);
    mode.onChange(suggestAddress);
    count.onChange(() => {
        number.setValue(findFreeNumber(entries, count.value, number.value));
        suggestAddress();
    });
    universeField.onChange(suggestAddress);
    address.onChange(describe);
    firstFree.onPress(() => {
        // The key looks from the start of the universe, not from the chosen address
        from = 1;
        suggestAddress();
    });
    picker.setFixtures(fixtures, null);

    const submit = async (): Promise<void> => {
        const fixture = picker.selected;
        if (fixture === null) {
            return;
        }
        try {
            await engine().request('patch.add', {
                definition: fixture.id,
                mode: mode.value,
                count: count.value,
                universe: universeField.value,
                address: address.value,
                number: number.value,
                name: name.value
            });
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };

    const cancel = new Key({ label: t('common.cancel') });
    cancel.onPress(() => dialog.close());
    add.onPress(() => void submit());
    dialog.addActions(cancel, add);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    picker.focus();
}
