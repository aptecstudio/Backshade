/**
 * Settings of a track: name, folder, height and, by kind, the audio output
 * and volume, the video output and layer, or the target of the automation;
 * the track can be deleted (a folder gives its tracks to its own parent).
 */

import { Dialog, Key, LinearSlider, NumberField, SelectField, Stack, TextField, Label } from '../../../framework/ts/index.js';
import { MAX_VIDEO_LAYERS } from '../../../shared/video/video.js';
import { TRACK_HEIGHT, type AutomationTarget, type Timeline, type Track } from '../../../shared/timeline/timeline.js';
import { t } from '../../i18n/i18n.js';
import type { EditorContext } from './editor-context.js';

/** Result of the dialog */
export type TrackDialogResult = { action: 'save'; track: Track } | { action: 'delete' };

function targetValue(target: AutomationTarget | null): string {
    if (target === null) {
        return '';
    }
    return target.kind === 'master' ? `master:${target.master}` : `${target.kind}:${target.id}`;
}

export function openTrackDialog(track: Track, timeline: Timeline, context: EditorContext): Promise<TrackDialogResult | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: t('timeline.trackTitle', { kind: t(`timeline.kinds.${track.kind}`) }) });
        const name = new TextField({ label: t('patch.name'), value: track.name, maxLength: 60 });
        // A folder cannot go inside itself or one of its tracks
        const inside = (folderId: string): boolean => {
            let current: Track | undefined = timeline.tracks.find((item) => item.id === folderId);
            while (current !== undefined) {
                if (current.id === track.id) {
                    return true;
                }
                current = current.parent === null ? undefined : timeline.tracks.find((item) => item.id === current?.parent);
            }
            return false;
        };
        const folders = timeline.tracks.filter((item) => item.kind === 'folder' && !inside(item.id));
        const parent = new SelectField<string>({
            label: t('timeline.folder'),
            options: [{ value: '', label: t('timeline.noFolder') }, ...folders.map((folder) => ({ value: folder.id, label: folder.name }))],
            value: track.parent ?? ''
        });
        const height = new NumberField({ label: t('timeline.height'), value: track.height, min: TRACK_HEIGHT.min, max: TRACK_HEIGHT.max, unit: 'px' });
        const fields: Stack[] = [new Stack({ direction: 'row', gap: 2, wrap: true, children: [name, parent, height] })];

        const device = new SelectField<string>({
            label: t('audio.output'),
            options: [{ value: '', label: t('audio.defaultOutput') }, ...context.devices.map((item) => ({ value: item.id, label: item.label || item.id }))],
            value: track.device
        });
        const volume = new LinearSlider({ label: t('audio.volume'), value: track.volume });
        const output = new SelectField<string>({
            label: t('timeline.videoOutput'),
            options: [{ value: '', label: t('timeline.noOutput') }, ...context.video.outputs.map((item) => ({ value: item.id, label: item.name }))],
            value: track.output
        });
        const layer = new SelectField<string>({
            label: t('timeline.layer'),
            options: Array.from({ length: MAX_VIDEO_LAYERS }, (_, index) => ({ value: String(index), label: t('video.layer', { number: index + 1 }) })),
            value: String(track.layer)
        });
        const target = new SelectField<string>({
            label: t('timeline.target'),
            options: [
                { value: '', label: t('timeline.noTarget') },
                ...(['a', 'b', 'scene', 'grand'] as const).map((master) => ({ value: `master:${master}`, label: t(`grid.masters.${master}`) })),
                ...context.groups.map((group) => ({ value: `group:${group.id}`, label: t('timeline.groupTarget', { name: group.name }) })),
                ...context.memories.scenes.map((scene) => ({ value: `scene:${scene.id}`, label: t('timeline.sceneTarget', { name: scene.name }) }))
            ],
            value: targetValue(track.target)
        });
        if (track.kind === 'audio') {
            fields.push(new Stack({ direction: 'row', gap: 2, wrap: true, align: 'end', children: [device, new Stack({ gap: 1, classes: ['clip-dialog__slider'], children: [new Label({ text: t('audio.volume'), size: 'small' }), volume] })] }));
        } else if (track.kind === 'video') {
            fields.push(new Stack({ direction: 'row', gap: 2, wrap: true, children: [output, layer] }));
        } else if (track.kind === 'automation') {
            fields.push(new Stack({ children: [target] }));
        }
        dialog.append(...fields);

        const finish = (result: TrackDialogResult | null): void => {
            dialog.close();
            resolve(result);
        };
        const readTarget = (): AutomationTarget | null => {
            const [kind, id] = target.value.split(':');
            if (kind === 'master') {
                return { kind: 'master', master: id as 'a' | 'b' | 'scene' | 'grand' };
            }
            return kind === 'group' || kind === 'scene' ? { kind, id } : null;
        };
        const remove = new Key({ label: t('timeline.deleteTrack'), icon: 'trash-2', armed: true });
        const cancel = new Key({ label: t('common.cancel') });
        const apply = new Key({ label: t('common.apply'), state: 'active' });
        remove.onPress(() => finish({ action: 'delete' }));
        cancel.onPress(() => finish(null));
        apply.onPress(() => finish({
            action: 'save',
            track: {
                ...track,
                name: name.value.trim() || track.name,
                parent: parent.value === '' ? null : parent.value,
                height: Math.round(height.value / 8) * 8,
                device: device.value,
                volume: volume.value,
                output: output.value,
                layer: Number(layer.value),
                target: track.kind === 'automation' ? readTarget() : track.target
            }
        }));
        dialog.addActions(remove, cancel, apply);
        dialog.onCancel(() => finish(null));
        dialog.open();
        name.focus();
    });
}
