/**
 * One layer in the Video section: source (a video or an image of the show
 * media, a video input of the computer, or nothing), quality and frame rate
 * of an input, opacity, fit and repeat. Every change is sent at once to the
 * program or the preview of the output.
 */

import { ChoiceKeys, Label, LinearSlider, SelectField, Stack } from '../../../framework/ts/index.js';
import type { MediaItem } from '../../../shared/transport/engine-api.js';
import type { ShowTimer } from '../../../shared/video/show-timer.js';
import type { TextGobo } from '../../../shared/video/text-gobo.js';
import {
    INPUT_FRAME_RATES,
    INPUT_QUALITIES,
    LAYER_FITS,
    type InputQuality,
    type LayerFit,
    type LayerSource,
    type LayerState,
    type VideoInput
} from '../../../shared/video/video.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

/** Value of the source select: "video:file", "image:file", "input:device" or empty */
function sourceValue(source: LayerSource | null): string {
    if (source === null) {
        return '';
    }
    switch (source.kind) {
        case 'input': return `input:${source.device}`;
        case 'gobo': return `gobo:${source.gobo}`;
        case 'timer': return `timer:${source.timer}`;
        default: return `${source.kind}:${source.file}`;
    }
}

export class LayerRow extends Stack {
    private readonly source: SelectField<string>;
    private readonly quality: SelectField<InputQuality>;
    private readonly frameRate: SelectField<string>;
    private readonly inputRow: Stack;
    private readonly opacity: LinearSlider;
    private readonly fit: SelectField<LayerFit>;
    private readonly loop: ChoiceKeys<'no' | 'yes'>;
    private layer: LayerState;

    constructor(
        outputId: string,
        target: 'program' | 'preview',
        index: number,
        layer: LayerState,
        media: readonly MediaItem[],
        inputs: readonly VideoInput[],
        gobos: readonly TextGobo[],
        timers: readonly ShowTimer[]
    ) {
        super({ direction: 'row', gap: 2, align: 'end', wrap: true, classes: ['video-layer'] });
        this.layer = layer;
        const files = media.filter((item) => item.kind === 'video' || (item.kind === 'image' && !item.file.toLowerCase().endsWith('.svg')));
        const current = layer.source;
        // An input not connected now stays in the list with its name
        const knownInputs = current?.kind === 'input' && !inputs.some((input) => input.id === current.device)
            ? [...inputs, { id: current.device, label: current.label }]
            : inputs;
        this.source = new SelectField<string>({
            ariaLabel: t('video.layerSource', { number: index + 1 }),
            options: [
                { value: '', label: t('video.noSource') },
                ...files.map((item) => ({ value: `${item.kind}:${item.file}`, label: item.name })),
                ...knownInputs.map((input) => ({ value: `input:${input.id}`, label: t('video.inputName', { name: input.label || input.id.slice(0, 8) }) })),
                ...gobos.map((gobo) => ({ value: `gobo:${gobo.id}`, label: t('video.goboName', { name: gobo.name }) })),
                ...timers.map((timer) => ({ value: `timer:${timer.id}`, label: t('video.timerName', { name: timer.name }) }))
            ],
            value: sourceValue(current)
        });
        this.quality = new SelectField<InputQuality>({
            ariaLabel: t('video.quality'),
            options: INPUT_QUALITIES.map((quality) => ({ value: quality, label: quality })),
            value: current?.kind === 'input' ? current.quality : '1080p'
        });
        this.frameRate = new SelectField<string>({
            ariaLabel: t('video.frameRate'),
            options: INPUT_FRAME_RATES.map((rate) => ({ value: String(rate), label: t('video.fps', { rate }) })),
            value: String(current?.kind === 'input' ? current.frameRate : 30)
        });
        this.inputRow = new Stack({ direction: 'row', gap: 1, children: [this.quality, this.frameRate] });
        this.opacity = new LinearSlider({ label: t('video.opacity'), value: layer.opacity });
        this.fit = new SelectField<LayerFit>({
            ariaLabel: t('video.fit'),
            options: LAYER_FITS.map((fit) => ({ value: fit, label: t(`matrices.fits.${fit}`) })),
            value: layer.fit
        });
        this.loop = new ChoiceKeys<'no' | 'yes'>({
            ariaLabel: t('audio.loop'),
            options: [{ value: 'no', label: t('video.once') }, { value: 'yes', label: t('audio.loop') }],
            value: layer.loop ? 'yes' : 'no'
        });

        const send = (change: Partial<LayerState>): void => {
            this.layer = { ...this.layer, ...change };
            this.showKind();
            void engine().request('video.setLayer', { output: outputId, target, index, layer: this.layer }).catch(showError);
        };
        const chosenSource = (): LayerSource | null => {
            const value = this.source.value;
            const at = value.indexOf(':');
            const kind = value.slice(0, at);
            const rest = value.slice(at + 1);
            if (value === '') {
                return null;
            }
            if (kind === 'timer') {
                return { kind: 'timer', timer: rest };
            }
            if (kind === 'gobo') {
                return { kind: 'gobo', gobo: rest };
            }
            if (kind === 'input') {
                const input = knownInputs.find((item) => item.id === rest);
                return { kind: 'input', device: rest, label: input?.label ?? '', quality: this.quality.value, frameRate: Number(this.frameRate.value) };
            }
            return { kind: kind === 'video' ? 'video' : 'image', file: rest };
        };
        this.source.onChange(() => send({ source: chosenSource() }));
        this.quality.onChange(() => send({ source: chosenSource() }));
        this.frameRate.onChange(() => send({ source: chosenSource() }));
        this.opacity.onChange((opacity) => send({ opacity }));
        this.fit.onChange((fit) => send({ fit }));
        this.loop.onChange((value) => send({ loop: value === 'yes' }));
        this.append(
            new Label({ text: t('video.layer', { number: index + 1 }), tone: 'secondary', size: 'small' }),
            this.source,
            this.inputRow,
            new Stack({ gap: 1, children: [new Label({ text: t('video.opacity'), size: 'small' }), this.opacity] }),
            this.fit,
            this.loop
        );
        this.showKind();
    }

    /**
     * Shows a layer changed elsewhere (another window, a scene, Take).
     */
    update(layer: LayerState): void {
        this.layer = layer;
        this.source.setValue(sourceValue(layer.source));
        if (layer.source?.kind === 'input') {
            this.quality.setValue(layer.source.quality);
            this.frameRate.setValue(String(layer.source.frameRate));
        }
        if (Math.abs(this.opacity.value - layer.opacity) > 0.002) {
            this.opacity.setValue(layer.opacity);
        }
        this.fit.setValue(layer.fit);
        this.loop.setValue(layer.loop ? 'yes' : 'no');
        this.showKind();
    }

    /** Input settings only for inputs, repeat only for videos */
    private showKind(): void {
        this.inputRow.element.hidden = this.layer.source?.kind !== 'input';
        this.loop.element.hidden = this.layer.source?.kind !== 'video';
    }
}
