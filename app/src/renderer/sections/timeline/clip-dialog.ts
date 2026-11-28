/**
 * Adds or changes a clip: what it plays (by kind of track), name, start,
 * length, offset into the file, fades and, for audio, the volume; for video
 * the layer settings. A new audio or video clip takes the length of its file.
 */

import { MIXER_PROFILES } from '../../../shared/mixers/mixers.js';
import { Dialog, Key, Label, LinearSlider, NumberField, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import { SHOW_MEDIA_ROUTE } from '../../../shared/audio/playback-protocol.js';
import type { Clip, ClipSource, Track } from '../../../shared/timeline/timeline.js';
import { LAYER_FITS, type LayerFit, type LayerSource } from '../../../shared/video/video.js';
import { t } from '../../i18n/i18n.js';
import type { EditorContext } from './editor-context.js';

/** Result of the dialog */
export type ClipDialogResult = { action: 'save'; clip: Clip } | { action: 'delete' };

/**
 * Length of a media file, in seconds; null when it cannot be read.
 */
export function mediaDuration(file: string, kind: 'audio' | 'video'): Promise<number | null> {
    return new Promise((resolve) => {
        const element = document.createElement(kind === 'audio' ? 'audio' : 'video');
        element.preload = 'metadata';
        element.onloadedmetadata = () => resolve(Number.isFinite(element.duration) ? element.duration : null);
        element.onerror = () => resolve(null);
        element.src = SHOW_MEDIA_ROUTE + file.split('/').map(encodeURIComponent).join('/');
    });
}

/** Value of the source select of a clip */
function sourceValue(source: ClipSource): string {
    switch (source.kind) {
        case 'scene': return `scene:${source.id}`;
        case 'chaser': return `chaser:${source.id}`;
        case 'audio': return `audio:${source.file}`;
        case 'mixer': return `mixer:${source.number}`;
        case 'mapping': return source.preset === '' ? '' : `mapping:${source.preset}`;
        case 'layer': {
            const layer = source.layer.source;
            if (layer === null) {
                return '';
            }
            switch (layer.kind) {
                case 'video':
                case 'image': return `${layer.kind}:${layer.file}`;
                case 'gobo': return `gobo:${layer.gobo}`;
                case 'timer': return `timer:${layer.timer}`;
                case 'input': return `input:${layer.device}`;
            }
        }
    }
}

/**
 * Opens the dialog.
 * @param isNew - The clip is being added
 */
export function openClipDialog(track: Track, clip: Clip, isNew: boolean, context: EditorContext): Promise<ClipDialogResult | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: isNew ? t('timeline.addClip') : t('timeline.clip') });
        const options: Array<{ value: string; label: string }> = [];
        if (track.kind === 'light') {
            options.push(...context.memories.scenes.map((scene) => ({ value: `scene:${scene.id}`, label: `S${scene.slot} ${scene.name}` })));
            options.push(...context.memories.chasers.map((chaser) => ({ value: `chaser:${chaser.id}`, label: `C${chaser.slot} ${chaser.name}` })));
        } else if (track.kind === 'mapping') {
            const presets = context.video.outputs.find((output) => output.id === track.output)?.presets ?? [];
            options.push(...presets.map((preset) => ({ value: `mapping:${preset.id}`, label: preset.name })));
        } else if (track.kind === 'audio') {
            options.push(...context.media.filter((item) => item.kind === 'audio').map((item) => ({ value: `audio:${item.file}`, label: item.name })));
        } else if (track.kind === 'video') {
            options.push(...context.media.filter((item) => item.kind === 'video' || (item.kind === 'image' && !item.file.toLowerCase().endsWith('.svg')))
                .map((item) => ({ value: `${item.kind}:${item.file}`, label: item.name })));
            options.push(...context.video.gobos.map((gobo) => ({ value: `gobo:${gobo.id}`, label: t('video.goboName', { name: gobo.name }) })));
            options.push(...context.video.timers.map((timer) => ({ value: `timer:${timer.id}`, label: t('video.timerName', { name: timer.name }) })));
        }
        const source = new SelectField<string>({ label: t('timeline.source'), options, value: sourceValue(clip.source) || options[0]?.value || '' });
        // Mixer tracks: the number of the scene of the mixer of the track
        const model = context.mixers.find((item) => item.id === track.mixer)?.model ?? 'osc';
        const range = MIXER_PROFILES[model];
        const sceneNumber = new NumberField({
            label: t('mixers.scene'),
            value: Math.min(range.last, Math.max(range.first, clip.source.kind === 'mixer' ? clip.source.number : range.first)),
            min: range.first,
            max: range.last
        });
        const isMixer = track.kind === 'mixer';
        /** Clips that recall something at their start: no offset or fades */
        const recalls = isMixer || track.kind === 'mapping';
        const hasSource = isMixer || options.length > 0;
        const name = new TextField({ label: t('patch.name'), value: clip.name, maxLength: 60 });
        const seconds = (label: string, value: number, min = 0): NumberField => new NumberField({ label, value, min, max: 4 * 3600, decimals: 2, unit: 's' });
        const start = seconds(t('timeline.start'), clip.start);
        const duration = seconds(t('timeline.length'), clip.duration, 0.05);
        const offset = seconds(t('timeline.offset'), clip.offset);
        const fadeIn = seconds(t('memories.fadeIn'), clip.fadeIn);
        const fadeOut = seconds(t('memories.fadeOut'), clip.fadeOut);
        const volume = new LinearSlider({ label: t('audio.volume'), value: clip.source.kind === 'audio' ? clip.source.volume : 1 });
        const layer = clip.source.kind === 'layer' ? clip.source.layer : null;
        const opacity = new LinearSlider({ label: t('video.opacity'), value: layer?.opacity ?? 1 });
        const fit = new SelectField<LayerFit>({ label: t('video.fit'), options: LAYER_FITS.map((item) => ({ value: item, label: t(`matrices.fits.${item}`) })), value: layer?.fit ?? 'fill' });
        offset.element.hidden = track.kind === 'light' || recalls;
        fadeIn.element.hidden = recalls;
        fadeOut.element.hidden = recalls;

        const slider = (label: string, control: LinearSlider): Stack => new Stack({ gap: 8, classes: ['clip-dialog__slider'], children: [new Label({ text: label, size: 'small' }), control] });
        dialog.append(
            isMixer ? sceneNumber : options.length === 0 ? new Label({ text: t(`timeline.noSources.${track.kind as 'light' | 'audio' | 'video' | 'mapping'}`), tone: 'secondary', size: 'small' }) : source,
            name,
            new Stack({ direction: 'row', gap: 8, wrap: true, children: [start, duration, offset] }),
            new Stack({ direction: 'row', gap: 8, wrap: true, children: [fadeIn, fadeOut] }),
            ...(track.kind === 'audio' ? [slider(t('audio.volume'), volume)] : []),
            ...(track.kind === 'video' ? [new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end', children: [slider(t('video.opacity'), opacity), fit] })] : [])
        );

        // A new audio or video clip takes the length of its file
        source.onChange((value) => {
            const [kind, ...rest] = value.split(':');
            if (isNew && (kind === 'audio' || kind === 'video')) {
                void mediaDuration(rest.join(':'), kind).then((length) => {
                    if (length !== null) {
                        duration.setValue(length);
                    }
                });
            }
        });
        if (isNew && options.length > 0) {
            const [kind, ...rest] = source.value.split(':');
            if (kind === 'audio' || kind === 'video') {
                void mediaDuration(rest.join(':'), kind).then((length) => {
                    if (length !== null) {
                        duration.setValue(length);
                    }
                });
            }
        }

        const chosenSource = (): ClipSource | null => {
            if (isMixer) {
                return { kind: 'mixer', number: sceneNumber.value };
            }
            const value = source.value;
            const at = value.indexOf(':');
            const kind = value.slice(0, at);
            const rest = value.slice(at + 1);
            if (value === '') {
                return null;
            }
            if (kind === 'mapping') {
                return { kind, preset: rest };
            }
            if (kind === 'scene' || kind === 'chaser') {
                return { kind, id: rest };
            }
            if (kind === 'audio') {
                return { kind: 'audio', file: rest, volume: volume.value };
            }
            let layerSource: LayerSource;
            if (kind === 'gobo') {
                layerSource = { kind: 'gobo', gobo: rest };
            } else if (kind === 'timer') {
                layerSource = { kind: 'timer', timer: rest };
            } else {
                layerSource = { kind: kind === 'video' ? 'video' : 'image', file: rest };
            }
            return { kind: 'layer', layer: { source: layerSource, opacity: opacity.value, fit: fit.value, loop: layer?.loop ?? false } };
        };

        const finish = (result: ClipDialogResult | null): void => {
            dialog.close();
            resolve(result);
        };
        const cancel = new Key({ label: t('common.cancel') });
        const apply = new Key({ label: isNew ? t('grid.add') : t('common.apply'), state: 'active' });
        apply.setDisabled(!hasSource);
        cancel.onPress(() => finish(null));
        apply.onPress(() => {
            const next = chosenSource();
            if (next === null) {
                return;
            }
            const length = Math.max(0.05, duration.value);
            finish({
                action: 'save',
                clip: {
                    ...clip,
                    source: next,
                    name: name.value.trim(),
                    start: start.value,
                    duration: length,
                    offset: offset.value,
                    fadeIn: Math.min(fadeIn.value, length),
                    fadeOut: Math.min(fadeOut.value, length)
                }
            });
        });
        if (!isNew) {
            const remove = new Key({ label: t('common.delete'), icon: 'trash-2', armed: true });
            remove.onPress(() => finish({ action: 'delete' }));
            dialog.addActions(remove);
        }
        dialog.addActions(cancel, apply);
        dialog.onCancel(() => finish(null));
        dialog.open();
    });
}
