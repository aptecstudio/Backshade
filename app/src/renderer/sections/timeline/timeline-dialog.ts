/**
 * Settings of a timeline: name, tempo, beats per bar and length; the
 * timeline can be deleted.
 */

import { Dialog, Key, NumberField, Stack, TextField, TimeField } from '../../../framework/ts/index.js';
import { TIMELINE_LIMITS, type Timeline } from '../../../shared/timeline/timeline.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { timePickerLabels } from '../../i18n/control-labels.js';
import { t } from '../../i18n/i18n.js';

/** Result of the dialog */
export type TimelineDialogResult = { action: 'save'; name: string; bpm: number; beatsPerBar: number; length: number } | { action: 'delete' };

export function openTimelineDialog(timeline: Timeline): Promise<TimelineDialogResult | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: t('timeline.settings') });
        const name = new TextField({ label: t('patch.name'), value: timeline.name, maxLength: 60 });
        const bpm = new NumberField({ label: t('memories.bpm'), value: timeline.bpm, min: TIMELINE_LIMITS.bpm.min, max: TIMELINE_LIMITS.bpm.max, decimals: 1, unit: t('memories.bpmUnit') });
        const meter = new NumberField({ label: t('timeline.beatsPerBar'), value: timeline.beatsPerBar, min: 1, max: 16 });
        const length = new TimeField({ label: t('timeline.length'), value: timeline.length, min: 1, max: TIMELINE_LIMITS.length, decimals: 0, labels: timePickerLabels() });
        dialog.append(name, new Stack({ direction: 'row', gap: 2, wrap: true, children: [bpm, meter, length] }));
        const finish = (result: TimelineDialogResult | null): void => {
            dialog.close();
            resolve(result);
        };
        const remove = new Key({ label: t('timeline.deleteTimeline'), icon: 'trash-2', armed: true });
        remove.onPress(() => void askChoice(t('timeline.deleteTimeline'), t('timeline.deleteConfirm', { name: timeline.name }), [
            { id: 'cancel', label: t('common.cancel') },
            { id: 'delete', label: t('common.delete'), destructive: true, primary: true }
        ]).then((choice) => {
            if (choice === 'delete') {
                finish({ action: 'delete' });
            }
        }));
        const cancel = new Key({ label: t('common.cancel') });
        const apply = new Key({ label: t('common.apply'), state: 'active' });
        cancel.onPress(() => finish(null));
        apply.onPress(() => finish({ action: 'save', name: name.value.trim() || timeline.name, bpm: bpm.value, beatsPerBar: meter.value, length: length.value }));
        dialog.addActions(remove, cancel, apply);
        dialog.onCancel(() => finish(null));
        dialog.open();
        name.focus();
    });
}
