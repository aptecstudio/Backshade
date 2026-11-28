/**
 * Changes an item of the playlist: name, start and end time (or the end
 * of the file), fade in and fade out, volume and repeat. When a scene or
 * cue starts the item, the fades of the scene are used instead.
 */

import { ChoiceKeys, Dialog, Key, Label, NumberField, Stack, TextField, TimeField } from '../../../framework/ts/index.js';
import { AUDIO_NAME_MAX_LENGTH, type AudioItem } from '../../../shared/audio/audio.js';
import { FADE_LIMITS } from '../../../shared/show/show-settings.js';
import { showError } from '../../dialogs/show-error.js';
import { timePickerLabels } from '../../i18n/control-labels.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

// Longest start or end time, in seconds
const MAX_TIME = 24 * 3600;

export function openAudioItemDialog(item: AudioItem): void {
    const dialog = new Dialog({ title: t('audio.itemTitle'), size: 'wide' });
    const name = new TextField({ label: t('patch.name'), value: item.name, maxLength: AUDIO_NAME_MAX_LENGTH });
    const start = new TimeField({ label: t('audio.start'), value: item.start, min: 0, max: MAX_TIME, labels: timePickerLabels() });
    const endMode = new ChoiceKeys<'file' | 'time'>({
        label: t('audio.end'),
        options: [{ value: 'file', label: t('audio.fileEnd') }, { value: 'time', label: t('audio.endTime') }],
        value: item.end === null ? 'file' : 'time'
    });
    const end = new TimeField({ label: t('audio.endTime'), value: item.end ?? item.start + 60, min: 0, max: MAX_TIME, labels: timePickerLabels() });
    end.element.hidden = item.end === null;
    endMode.onChange((mode) => {
        end.element.hidden = mode === 'file';
    });
    const fadeIn = new TimeField({ label: t('memories.fadeIn'), value: item.fadeIn, min: FADE_LIMITS.min, max: FADE_LIMITS.max, labels: timePickerLabels() });
    const fadeOut = new TimeField({ label: t('memories.fadeOut'), value: item.fadeOut, min: FADE_LIMITS.min, max: FADE_LIMITS.max, labels: timePickerLabels() });
    const volume = new NumberField({ label: t('audio.volume'), value: Math.round(item.volume * 100), min: 0, max: 100, unit: '%' });
    const loop = new ChoiceKeys<'no' | 'yes'>({
        label: t('audio.loop'),
        options: [{ value: 'no', label: t('matrix.snakeNo') }, { value: 'yes', label: t('matrix.snakeYes') }],
        value: item.loop ? 'yes' : 'no'
    });

    dialog.append(
        new Label({ text: item.file, tone: 'secondary', size: 'small' }),
        name,
        new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end', children: [start, endMode, end] }),
        new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end', children: [fadeIn, fadeOut, volume, loop] }),
        new Label({ text: t('audio.itemHint'), tone: 'secondary', size: 'small' })
    );

    const apply = async (): Promise<void> => {
        try {
            await engine().request('audio.updateItem', {
                id: item.id,
                name: name.value,
                start: start.value,
                end: endMode.value === 'file' ? null : end.value,
                fadeIn: fadeIn.value,
                fadeOut: fadeOut.value,
                volume: volume.value / 100,
                loop: loop.value === 'yes'
            });
            dialog.close();
        } catch (error) {
            await showError(error);
        }
    };
    const remove = new Key({ label: t('audio.remove'), icon: 'trash-2', armed: true });
    const cancel = new Key({ label: t('common.cancel') });
    const applyKey = new Key({ label: t('common.apply'), state: 'active' });
    remove.onPress(() => void engine().request('audio.removeItem', { id: item.id }).then(() => dialog.close()).catch(showError));
    cancel.onPress(() => dialog.close());
    applyKey.onPress(() => void apply());
    dialog.addActions(remove, cancel, applyKey);
    dialog.onCancel(() => dialog.close());
    dialog.open();
    name.focus();
}
