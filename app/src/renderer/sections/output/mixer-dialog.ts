/**
 * Adds or changes an external audio mixer: name, model, address and port,
 * and for a generic OSC device the address sent to recall a scene. A test
 * row recalls a scene of the mixer at once. Mixers belong to the show, so
 * a change is an unsaved change of the show.
 */

import { ChoiceKeys, Dialog, Key, Label, NumberField, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { MIXER_MODELS, MIXER_PROFILES, NUMBER_PLACEHOLDER, newMixer, type MixerModel, type ShowMixer } from '../../../shared/mixers/mixers.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

type YesNo = 'yes' | 'no';

/** Name of a model */
export function mixerModelLabel(model: MixerModel): string {
    return t(`mixers.models.${model}`);
}

/**
 * Opens the dialog.
 * @param mixer - Mixer to change, or null to add one
 * @param number - Number of the new mixer, for its name
 */
export function openMixerDialog(mixer: ShowMixer | null, number: number): void {
    const draft = mixer ?? newMixer('', t('mixers.defaultName', { number }));
    const dialog = new Dialog({ title: mixer === null ? t('mixers.add') : t('mixers.title') });
    const name = new TextField({ label: t('patch.name'), value: draft.name, maxLength: 60 });
    const model = new SelectField<MixerModel>({
        label: t('mixers.model'),
        options: MIXER_MODELS.map((value) => ({ value, label: mixerModelLabel(value) })),
        value: draft.model
    });
    const host = new TextField({ label: t('mixers.host'), value: draft.host, maxLength: 253 });
    const port = new NumberField({ label: t('mixers.port'), value: draft.port, min: 1, max: 65535 });
    const address = new TextField({ label: t('mixers.address'), value: draft.address, maxLength: 200 });
    const argument = new ChoiceKeys<YesNo>({
        label: t('mixers.numberArgument'),
        options: [{ value: 'no', label: t('matrix.snakeNo') }, { value: 'yes', label: t('matrix.snakeYes') }],
        value: draft.numberArgument ? 'yes' : 'no'
    });
    // MIDI mixers: output port, channel and bank select
    const midiDevice = new SelectField<string>({ label: t('mixers.midiDevice'), options: draft.midiDevice === '' ? [] : [{ value: draft.midiDevice, label: draft.midiDevice }], value: draft.midiDevice });
    const midiChannel = new NumberField({ label: t('mixers.midiChannel'), value: draft.midiChannel, min: 1, max: 16 });
    const bankSelect = new ChoiceKeys<YesNo>({
        label: t('mixers.bankSelect'),
        options: [{ value: 'no', label: t('matrix.snakeNo') }, { value: 'yes', label: t('matrix.snakeYes') }],
        value: draft.bankSelect ? 'yes' : 'no'
    });
    const midi = new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end', children: [midiDevice, midiChannel, bankSelect] });
    const network = new Stack({ direction: 'row', gap: 8, wrap: true, children: [host, port] });
    void engine().request('midi.getState').then((state) => {
        const names = [...new Set(state.devices.filter((device) => device.kind === 'output').map((device) => device.name))];
        if (draft.midiDevice !== '' && !names.includes(draft.midiDevice)) {
            names.push(draft.midiDevice);
        }
        midiDevice.setOptions(names.map((name) => ({ value: name, label: name })), draft.midiDevice !== '' ? draft.midiDevice : names[0] ?? '');
    }).catch(() => undefined);
    const genericHint = new Label({ text: t('mixers.addressHint', { placeholder: NUMBER_PLACEHOLDER }), tone: 'secondary', size: 'small' });
    const modelHint = new Label({ text: '', tone: 'secondary', size: 'small' });
    const generic = new Stack({ gap: 8, children: [new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end', children: [address, argument] }), genericHint] });

    const testNumber = new NumberField({ label: t('mixers.testScene'), value: MIXER_PROFILES[draft.model].first, min: 0, max: 9999 });
    const test = new Key({ label: t('mixers.test'), icon: 'play' });
    const testResult = new Label({ text: '', tone: 'secondary', size: 'small' });

    const read = (): ShowMixer => ({
        ...draft,
        name: name.value.trim() || draft.name,
        model: model.value,
        host: host.value.trim(),
        port: Math.round(port.value),
        address: address.value.trim().startsWith('/') ? address.value.trim() : draft.address,
        numberArgument: argument.value === 'yes',
        midiDevice: midiDevice.value,
        midiChannel: Math.round(midiChannel.value),
        bankSelect: bankSelect.value === 'yes'
    });
    const showModel = (): void => {
        const profile = MIXER_PROFILES[model.value];
        generic.element.hidden = model.value !== 'osc';
        midi.element.hidden = model.value !== 'midi';
        network.element.hidden = model.value === 'midi';
        modelHint.setText(model.value === 'osc' ? '' : t(`mixers.hints.${model.value as Exclude<MixerModel, 'osc'>}`, { first: profile.first, last: profile.last }));
        modelHint.element.hidden = model.value === 'osc';
    };
    model.onChange((value) => {
        // The port follows the model while it is still the default of another model
        if (MIXER_MODELS.some((item) => MIXER_PROFILES[item].port === port.value)) {
            port.setValue(MIXER_PROFILES[value].port);
        }
        testNumber.setValue(MIXER_PROFILES[value].first);
        showModel();
    });
    showModel();

    // The test saves the mixer first, so it sends what the dialog shows
    let saved: ShowMixer | null = mixer;
    const save = async (): Promise<ShowMixer | null> => {
        try {
            const result = await engine().request('mixers.save', { mixer: { ...read(), id: saved?.id ?? '' } });
            saved = saved === null ? result.mixers[result.mixers.length - 1] : result.mixers.find((item) => item.id === saved?.id) ?? null;
            return saved;
        } catch (error) {
            await showError(error);
            return null;
        }
    };
    test.onPress(() => void (async () => {
        const current = await save();
        if (current === null) {
            return;
        }
        try {
            await engine().request('mixers.recall', { mixer: current.id, number: testNumber.value });
            testResult.setText(current.model === 'midi' ? t('mixers.testSentMidi', { number: testNumber.value, device: current.midiDevice }) : t('mixers.testSent', { number: testNumber.value, host: current.host, port: current.port }));
        } catch (error) {
            testResult.setText('');
            await showError(error);
        }
    })());

    dialog.append(
        new Stack({ direction: 'row', gap: 8, wrap: true, children: [name, model] }),
        network,
        midi,
        modelHint,
        generic,
        new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end', children: [testNumber, test] }),
        testResult
    );

    const remove = new Key({ label: t('mixers.delete'), icon: 'trash-2', armed: true });
    const cancel = new Key({ label: t('common.cancel') });
    const apply = new Key({ label: t('common.apply'), state: 'active' });
    remove.onPress(() => void askChoice(t('mixers.delete'), t('mixers.deleteConfirm', { name: draft.name }), [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'delete', label: t('common.delete'), destructive: true, primary: true }
    ]).then(async (choice) => {
        if (choice === 'delete' && saved !== null) {
            try {
                await engine().request('mixers.delete', { id: saved.id });
                dialog.close();
            } catch (error) {
                await showError(error);
            }
        }
    }));
    cancel.onPress(() => dialog.close());
    apply.onPress(() => void save().then((result) => {
        if (result !== null) {
            dialog.close();
        }
    }));
    dialog.addActions(...(mixer === null ? [] : [remove]), cancel, apply);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    name.focus();
}
