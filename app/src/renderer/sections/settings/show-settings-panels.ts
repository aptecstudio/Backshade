/**
 * Settings of the open show: description and notes, timecode
 * frame rate, default fade times, operators, MIDI mappings, import from another show. Every change goes to the engine immediately
 * and becomes an unsaved change of the show.
 */

import { ChoiceKeys, Label, Panel, Stack, TextArea, TextField, TimeField } from '../../../framework/ts/index.js';
import { FADE_LIMITS, type ShowSettings, type TimecodeRate } from '../../../shared/show/show-settings.js';
import { showError } from '../../dialogs/show-error.js';
import { timePickerLabels } from '../../i18n/control-labels.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { MidiSettings } from './midi-settings.js';
import { OperatorsSettings } from './operators-settings.js';
import { ShowImportSettings } from './show-import-settings.js';

// Wait after the last keystroke before sending a text to the engine
const TEXT_DELAY_MS = 400;

/**
 * Sends a change to the engine, showing any error.
 */
function send(changes: Partial<ShowSettings>): void {
    void engine().request('show.updateSettings', changes).catch(showError);
}

/**
 * Returns a function that sends the text after a pause in typing.
 */
function delayed(field: 'description' | 'notes'): (value: string) => void {
    let timer: number | undefined;
    return (value) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => send({ [field]: value }), TEXT_DELAY_MS);
    };
}

export class ShowSettingsPanels extends Stack {
    constructor(settings: ShowSettings) {
        super({ gap: 12, classes: ['show-settings'] });

        const description = new TextField({ label: t('settings.description'), value: settings.description, maxLength: 200 });
        const notes = new TextArea({ label: t('settings.notes'), value: settings.notes, maxLength: 10000 });
        description.onInput(delayed('description'));
        notes.onInput(delayed('notes'));

        const rate = new ChoiceKeys<TimecodeRate>({
            label: t('settings.timecodeRate'),
            value: settings.timecodeRate,
            options: [
                { value: '24', label: t('settings.rate24') },
                { value: '25', label: t('settings.rate25') },
                { value: '29.97df', label: t('settings.rate2997') },
                { value: '30', label: t('settings.rate30') }
            ]
        });
        rate.onChange((value) => send({ timecodeRate: value }));

        const fade = (label: string, value: number): TimeField => new TimeField({
            label, value, min: FADE_LIMITS.min, max: FADE_LIMITS.max, decimals: 1, labels: timePickerLabels()
        });
        const fadeIn = fade(t('settings.fadeIn'), settings.fadeInSeconds);
        const fadeOut = fade(t('settings.fadeOut'), settings.fadeOutSeconds);
        fadeIn.onChange((value) => send({ fadeInSeconds: value }));
        fadeOut.onChange((value) => send({ fadeOutSeconds: value }));

        const general = new Panel({ title: t('settings.showGeneral') });
        general.append(description, notes, new Label({ text: t('settings.showSettingsHint'), tone: 'secondary', size: 'small' }));
        const timecode = new Panel({ title: t('settings.timecode') });
        timecode.append(rate);
        const fades = new Panel({ title: t('settings.fades') });
        fades.append(new Stack({ direction: 'row', gap: 12, children: [fadeIn, fadeOut] }));

        this.append(general, timecode, fades, new OperatorsSettings(), new MidiSettings(), new ShowImportSettings());
    }
}
