/**
 * Settings of a marker of the ruler: name, time and stop (playback pauses
 * there in go mode); the marker can be deleted.
 */

import { ChoiceKeys, Dialog, Key, Stack, TextField, TimeField } from '../../../framework/ts/index.js';
import type { Marker, Timeline } from '../../../shared/timeline/timeline.js';
import { timePickerLabels } from '../../i18n/control-labels.js';
import { t } from '../../i18n/i18n.js';

/** Result of the dialog */
export type MarkerDialogResult = { action: 'save'; marker: Marker } | { action: 'delete' };

export function openMarkerDialog(marker: Marker, timeline: Timeline): Promise<MarkerDialogResult | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: t('timeline.marker') });
        const name = new TextField({ label: t('patch.name'), value: marker.name, maxLength: 60 });
        const time = new TimeField({ label: t('timeline.markerTime'), value: marker.time, min: 0, max: timeline.length, decimals: 2, labels: timePickerLabels() });
        const stop = new ChoiceKeys<'no' | 'yes'>({
            label: t('timeline.markerStop'),
            options: [{ value: 'no', label: t('timeline.markerPass') }, { value: 'yes', label: t('timeline.markerPause') }],
            value: marker.stop ? 'yes' : 'no'
        });
        dialog.append(new Stack({ direction: 'row', gap: 8, wrap: true, children: [name, time, stop] }));
        const finish = (result: MarkerDialogResult | null): void => {
            dialog.close();
            resolve(result);
        };
        const remove = new Key({ label: t('timeline.deleteMarker'), icon: 'trash-2', armed: true });
        remove.onPress(() => finish({ action: 'delete' }));
        const cancel = new Key({ label: t('common.cancel') });
        const apply = new Key({ label: t('common.apply'), state: 'active' });
        cancel.onPress(() => finish(null));
        apply.onPress(() => finish({ action: 'save', marker: { ...marker, name: name.value.trim() || marker.name, time: time.value, stop: stop.value === 'yes' } }));
        dialog.addActions(remove, cancel, apply);
        dialog.onCancel(() => finish(null));
        dialog.open();
        name.focus();
    });
}
