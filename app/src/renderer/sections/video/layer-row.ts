/**
 * One layer in the Video section: source (a video or an image of the show
 * media, or nothing), opacity, fit and repeat. Every change is sent at
 * once to the program or the preview of the output.
 */

import { ChoiceKeys, Label, LinearSlider, SelectField, Stack } from '../../../framework/ts/index.js';
import { LAYER_FITS, type LayerFit, type LayerState } from '../../../shared/video/video.js';
import type { MediaItem } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

export class LayerRow extends Stack {
    private readonly source: SelectField<string>;
    private readonly opacity: LinearSlider;
    private readonly fit: SelectField<LayerFit>;
    private readonly loop: ChoiceKeys<'no' | 'yes'>;
    private layer: LayerState;

    constructor(outputId: string, target: 'program' | 'preview', index: number, layer: LayerState, media: readonly MediaItem[]) {
        super({ direction: 'row', gap: 2, align: 'end', wrap: true, classes: ['video-layer'] });
        this.layer = layer;
        const files = media.filter((item) => item.kind === 'video' || (item.kind === 'image' && !item.file.toLowerCase().endsWith('.svg')));
        this.source = new SelectField<string>({
            ariaLabel: t('video.layerSource', { number: index + 1 }),
            options: [{ value: '', label: t('video.noSource') }, ...files.map((item) => ({ value: `${item.kind}:${item.file}`, label: item.name }))],
            value: layer.source === null ? '' : `${layer.source.kind}:${layer.source.file}`
        });
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
            void engine().request('video.setLayer', { output: outputId, target, index, layer: this.layer }).catch(showError);
        };
        this.source.onChange((value) => {
            const at = value.indexOf(':');
            const kind = value.slice(0, at);
            send({ source: value === '' ? null : { kind: kind === 'video' ? 'video' : 'image', file: value.slice(at + 1) } });
        });
        this.opacity.onChange((opacity) => send({ opacity }));
        this.fit.onChange((fit) => send({ fit }));
        this.loop.onChange((value) => send({ loop: value === 'yes' }));
        this.append(
            new Label({ text: t('video.layer', { number: index + 1 }), tone: 'secondary', size: 'small' }),
            this.source,
            new Stack({ gap: 1, children: [new Label({ text: t('video.opacity'), size: 'small' }), this.opacity] }),
            this.fit,
            this.loop
        );
    }

    /**
     * Shows a layer changed elsewhere (another window, a scene, Take).
     */
    update(layer: LayerState): void {
        this.layer = layer;
        this.source.setValue(layer.source === null ? '' : `${layer.source.kind}:${layer.source.file}`);
        if (Math.abs(this.opacity.value - layer.opacity) > 0.002) {
            this.opacity.setValue(layer.opacity);
        }
        this.fit.setValue(layer.fit);
        this.loop.setValue(layer.loop ? 'yes' : 'no');
    }
}
