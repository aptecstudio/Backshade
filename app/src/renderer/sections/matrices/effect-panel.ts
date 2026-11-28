/**
 * Live effect of the chosen matrix: the kind (off, basic effects, preset
 * animations) and the parameters the kind uses, colors, speed, size,
 * direction, angle and text. Every change reaches the output at once; the
 * record key of the console stores the effect in a scene.
 */

import { ChoiceKeys, Key, Label, LinearSlider, NumberField, Panel, SelectField, Stack, TextField } from '../../../framework/ts/index.js';
import {
    ANIMATION_EFFECTS,
    BASIC_EFFECTS,
    defaultEffect,
    EFFECT_DIRECTIONS,
    EFFECT_FONTS,
    EFFECT_SPECS,
    EFFECT_TEXT_MAX_LENGTH,
    IMAGE_FITS,
    type EffectDirection,
    type ImageFit,
    type MatrixEffect,
    type MatrixEffectKind
} from '../../../shared/patch/matrix-effect.js';
import type { MatrixEntry } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { ColorSwatch } from './color-swatch.js';
import { sampleImage } from './image-sampler.js';
import { renderTextMask } from './text-mask.js';

export class EffectPanel extends Panel {
    private readonly matrix: MatrixEntry;
    private readonly kindKeys = new Map<MatrixEffectKind | 'off', Key>();
    private readonly params = new Stack({ gap: 12, classes: ['effect-panel__params'] });
    private effect: MatrixEffect | null;
    private paramParts: Stack[] = [];

    constructor(matrix: MatrixEntry, effect: MatrixEffect | null) {
        super({ title: t('matrices.effect'), classes: ['effect-panel'] });
        this.matrix = matrix;
        this.effect = effect;

        const group = (title: string, kinds: ReadonlyArray<MatrixEffectKind | 'off'>): Stack => new Stack({
            gap: 8,
            children: [
                new Label({ text: title, tone: 'secondary', size: 'small' }),
                new Stack({
                    direction: 'row',
                    gap: 8,
                    wrap: true,
                    children: kinds.map((kind) => {
                        const key = new Key({ label: t(`matrices.kinds.${kind}`) });
                        key.onPress(() => this.choose(kind));
                        this.kindKeys.set(kind, key);
                        return key;
                    })
                })
            ]
        });
        this.append(
            group(t('matrices.basic'), ['off', ...BASIC_EFFECTS]),
            group(t('matrices.animations'), ANIMATION_EFFECTS),
            this.params,
            new Label({ text: t('matrices.recordHint'), tone: 'secondary', size: 'small' })
        );
        this.build();
    }

    /**
     * Follows a live effect changed elsewhere (another window, home):
     * the controls are rebuilt only when the kind changes.
     */
    follow(effect: MatrixEffect | null): void {
        if ((effect?.kind ?? null) !== (this.effect?.kind ?? null)) {
            this.effect = effect;
            this.build();
        } else {
            this.effect = effect;
        }
    }

    private choose(kind: MatrixEffectKind | 'off'): void {
        this.effect = kind === 'off' ? null : this.effect?.kind === kind ? this.effect : defaultEffect(kind);
        if (this.effect?.kind === 'text') {
            this.effect = { ...this.effect, mask: renderTextMask(this.effect.text, this.effect.font, this.effect.size, this.matrix.height) };
        }
        this.build();
        this.send();
    }

    private build(): void {
        for (const [kind, key] of this.kindKeys) {
            key.setState((this.effect?.kind ?? 'off') === kind ? 'active' : 'normal');
        }
        this.paramParts.forEach((part) => part.destroy());
        this.paramParts = [];
        const effect = this.effect;
        if (effect === null) {
            return;
        }
        const spec = EFFECT_SPECS[effect.kind];
        const parts: Stack[] = [];

        if (spec.colors.length > 0) {
            const swatches = effect.colors.map((color, index) => {
                const swatch = new ColorSwatch(t('matrices.color', { number: index + 1 }), color);
                swatch.onChange((value) => this.change((current) => ({ ...current, colors: current.colors.map((item, at) => at === index ? value : item) })));
                return swatch;
            });
            parts.push(new Stack({ direction: 'row', gap: 8, wrap: true, children: swatches }));
        }
        if (spec.text) {
            const text = new TextField({ label: t('matrices.text'), value: effect.text, maxLength: EFFECT_TEXT_MAX_LENGTH });
            const font = new SelectField<string>({ label: t('matrices.font'), options: EFFECT_FONTS.map((item) => ({ value: item, label: item })), value: effect.font });
            text.onInput((value) => this.change((current) => this.withMask({ ...current, text: value })));
            font.onChange((value) => this.change((current) => this.withMask({ ...current, font: value })));
            parts.push(new Stack({ direction: 'row', gap: 8, wrap: true, children: [text, font] }));
        }
        if (spec.image) {
            parts.push(this.imageControls(effect));
        }
        if (spec.speed) {
            parts.push(this.slider(t('matrices.speed'), effect.speed, (value) => this.change((current) => ({ ...current, speed: value }))));
        }
        if (spec.size) {
            parts.push(this.slider(t(`matrices.sizeOf.${effect.kind}`), effect.size, (value) => this.change((current) => effect.kind === 'text'
                ? this.withMask({ ...current, size: value })
                : { ...current, size: value })));
        }
        if (spec.direction) {
            const direction = new ChoiceKeys<EffectDirection>({
                label: t('matrices.direction'),
                options: EFFECT_DIRECTIONS.map((item) => ({ value: item, label: t(`matrices.directions.${item}`) })),
                value: effect.direction
            });
            direction.onChange((value) => this.change((current) => ({ ...current, direction: value })));
            parts.push(new Stack({ children: [direction] }));
        }
        if (spec.angle) {
            const angle = new NumberField({ label: t('matrices.angle'), value: effect.angle, min: 0, max: 359, unit: t('matrices.degrees') });
            angle.onChange((value) => this.change((current) => ({ ...current, angle: value })));
            parts.push(new Stack({ children: [angle] }));
        }
        this.paramParts = parts;
        this.params.append(...parts);
    }

    /**
     * Choice of the image among the raster images of the show media, and its fit.
     */
    private imageControls(effect: MatrixEffect): Stack {
        const file = new SelectField<string>({ label: t('matrices.image'), options: [], value: '' });
        const fit = new ChoiceKeys<ImageFit>({
            label: t('matrices.fit'),
            options: IMAGE_FITS.map((item) => ({ value: item, label: t(`matrices.fits.${item}`) })),
            value: effect.fit
        });
        const note = new Label({ text: '', tone: 'secondary', size: 'small' });
        const sample = (media: string, mode: ImageFit): void => {
            if (media === '') {
                return;
            }
            void sampleImage(media, mode, this.matrix.width, this.matrix.height)
                .then((image) => this.change((current) => ({ ...current, media, fit: mode, image })))
                .catch(showError);
        };
        file.onChange((value) => sample(value, fit.value));
        fit.onChange((value) => sample(file.value, value));
        void engine().request('media.list').then((items) => {
            const images = items.filter((item) => item.kind === 'image' && !item.file.toLowerCase().endsWith('.svg'));
            file.setOptions(
                [{ value: '', label: t('matrices.chooseImage') }, ...images.map((item) => ({ value: item.file, label: item.name }))],
                images.some((item) => item.file === effect.media) ? effect.media : ''
            );
            note.setText(images.length === 0 ? t('matrices.noImages') : '');
        }).catch(showError);
        return new Stack({ gap: 8, children: [new Stack({ direction: 'row', gap: 8, wrap: true, align: 'end', children: [file, fit] }), note] });
    }

    private slider(label: string, value: number, change: (value: number) => void): Stack {
        const slider = new LinearSlider({ label, value });
        slider.onChange(change);
        return new Stack({ gap: 8, classes: ['effect-panel__slider'], children: [new Label({ text: label, size: 'small' }), slider] });
    }

    private withMask(effect: MatrixEffect): MatrixEffect {
        return { ...effect, mask: renderTextMask(effect.text, effect.font, effect.size, this.matrix.height) };
    }

    private change(update: (effect: MatrixEffect) => MatrixEffect): void {
        if (this.effect === null) {
            return;
        }
        this.effect = update(this.effect);
        this.send();
    }

    private send(): void {
        void engine().request('matrices.setLive', { id: this.matrix.id, effect: this.effect }).catch(showError);
    }
}
