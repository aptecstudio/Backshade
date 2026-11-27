/**
 * Text gobos of the show, in the Video section: one key per preset, and
 * the editor of the chosen one with an animated preview. Every change is
 * saved in the show at once and shows on every layer that uses the preset.
 */

import {
    ChoiceKeys,
    Key,
    type Component,
    Label,
    LinearSlider,
    NumberField,
    Panel,
    SelectField,
    Stack,
    TextArea,
    TextField,
    TimeField
} from '../../../framework/ts/index.js';
import { EFFECT_FONTS } from '../../../shared/patch/matrix-effect.js';
import type { MediaItem } from '../../../shared/transport/engine-api.js';
import {
    defaultGobo,
    GOBO_ALIGNS,
    GOBO_ANIMATIONS,
    GOBO_DIRECTIONS,
    GOBO_MASKS,
    GOBO_PLACEHOLDERS,
    GOBO_TEXT_MAX_LENGTH,
    PRISM_FACETS,
    type TextGobo
} from '../../../shared/video/text-gobo.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { timePickerLabels } from '../../i18n/control-labels.js';
import { t } from '../../i18n/i18n.js';
import { markEdit } from '../../show/edit-access.js';
import { engine } from '../../transport/engine.js';
import { CompositionView } from '../../video/composition-view.js';
import { ColorSwatch } from '../matrices/color-swatch.js';

// Time without changes before a change is saved
const SAVE_DELAY_MS = 150;

export class GoboPanel extends Panel {
    private readonly keysRow = new Stack({ direction: 'row', gap: 1, wrap: true });
    private readonly editorHolder = new Stack({ gap: 2 });
    private keys: Key[] = [];
    private editor: Stack | null = null;
    private gobos: TextGobo[] = [];
    private media: MediaItem[] = [];
    private selected: string | null = null;
    private draft: TextGobo | null = null;
    private timer: number | null = null;

    constructor() {
        super({ title: t('gobos.title'), classes: ['gobo-panel'] });
        const add = new Key({ label: t('gobos.add'), icon: 'plus' });
        add.onPress(() => {
            const gobo = defaultGobo(crypto.randomUUID(), t('gobos.defaultName', { number: this.gobos.length + 1 }));
            this.selected = gobo.id;
            void engine().request('video.saveGobo', { gobo }).catch(showError);
        });
        markEdit(add);
        this.append(new Stack({ direction: 'row', gap: 2, align: 'center', wrap: true, children: [this.keysRow, add] }), this.editorHolder);
        this.track(() => {
            if (this.timer !== null) {
                window.clearTimeout(this.timer);
            }
        });
    }

    /**
     * Shows the presets; the editor is rebuilt only when the chosen preset changes.
     */
    show(gobos: readonly TextGobo[], media: readonly MediaItem[]): void {
        this.gobos = [...gobos];
        this.media = [...media];
        const chosen = this.gobos.find((gobo) => gobo.id === this.selected) ?? this.gobos[0] ?? null;
        const rebuild = chosen?.id !== this.draft?.id || this.editor === null;
        this.selected = chosen?.id ?? null;
        this.keys.forEach((key) => key.destroy());
        this.keys = this.gobos.map((gobo) => {
            const key = new Key({ label: gobo.name, state: gobo.id === this.selected ? 'active' : 'normal' });
            key.onPress(() => {
                this.selected = gobo.id;
                this.show(this.gobos, this.media);
            });
            return key;
        });
        this.keysRow.append(...this.keys);
        if (rebuild) {
            this.build(chosen);
        }
    }

    private build(gobo: TextGobo | null): void {
        this.editor?.destroy();
        this.editor = null;
        this.draft = gobo === null ? null : { ...gobo };
        if (gobo === null) {
            return;
        }
        const preview = new CompositionView(['gobo-panel__preview']);
        const refresh = (): void => {
            if (this.draft !== null) {
                preview.setGobos([this.draft], { cue: t('gobos.sampleCue'), song: t('gobos.sampleSong') });
            }
        };
        refresh();
        preview.show([{ source: { kind: 'gobo', gobo: gobo.id }, opacity: 1, fit: 'fill', loop: true }], 0);

        const change = (update: Partial<TextGobo>): void => {
            if (this.draft === null) {
                return;
            }
            this.draft = { ...this.draft, ...update };
            refresh();
            this.scheduleSave();
        };
        const slider = (label: string, value: number, apply: (value: number) => Partial<TextGobo>, scale = 1): Stack => {
            const control = new LinearSlider({ label, value: value / scale });
            control.onChange((next) => change(apply(next * scale)));
            return new Stack({ gap: 1, classes: ['gobo-panel__slider'], children: [new Label({ text: label, size: 'small' }), control] });
        };
        const swatch = (label: string, color: string, apply: (color: string) => Partial<TextGobo>): ColorSwatch => {
            const control = new ColorSwatch(label, color);
            control.onChange((next) => change(apply(next)));
            return control;
        };
        const choice = <T extends string>(label: string, values: readonly T[], value: T, text: (value: T) => string, apply: (value: T) => Partial<TextGobo>): ChoiceKeys<T> => {
            const control = new ChoiceKeys<T>({ label, options: values.map((item) => ({ value: item, label: text(item) })), value });
            control.onChange((next) => change(apply(next)));
            return control;
        };

        const name = new TextField({ label: t('patch.name'), value: gobo.name, maxLength: 60 });
        name.onInput((value) => change({ name: value.trim() || gobo.name }));
        const text = new TextArea({ label: t('gobos.text'), value: gobo.text, rows: 3, maxLength: GOBO_TEXT_MAX_LENGTH });
        text.onInput((value) => change({ text: value }));
        const font = new SelectField<string>({ label: t('matrices.font'), options: EFFECT_FONTS.map((item) => ({ value: item, label: item })), value: gobo.font });
        font.onChange((value) => change({ font: value }));

        const images = this.media.filter((item) => item.kind === 'image' && !item.file.toLowerCase().endsWith('.svg'));
        const maskFile = new SelectField<string>({
            label: t('gobos.maskImage'),
            options: [{ value: '', label: t('matrices.chooseImage') }, ...images.map((item) => ({ value: item.file, label: item.name }))],
            value: gobo.maskFile
        });
        maskFile.onChange((value) => change({ maskFile: value }));
        maskFile.element.hidden = gobo.mask !== 'image';
        const mask = choice(t('gobos.mask'), GOBO_MASKS, gobo.mask, (value) => t(`gobos.masks.${value}`), (value) => {
            maskFile.element.hidden = value !== 'image';
            return { mask: value };
        });
        const rotation = new NumberField({ label: t('gobos.rotation'), value: gobo.rotation, min: -180, max: 180, unit: t('matrices.degrees') });
        rotation.onChange((value) => change({ rotation: value }));
        const prism = new SelectField<string>({
            label: t('gobos.prism'),
            options: PRISM_FACETS.map((facets) => ({ value: String(facets), label: facets === 1 ? t('gobos.noPrism') : t('gobos.facets', { count: facets }) })),
            value: String(gobo.prism)
        });
        prism.onChange((value) => change({ prism: Number(value) }));
        const animation = new SelectField<string>({
            label: t('gobos.animation'),
            options: GOBO_ANIMATIONS.map((value) => ({ value, label: t(`gobos.animations.${value}`) })),
            value: gobo.animation
        });
        animation.onChange((value) => change({ animation: value as TextGobo['animation'] }));
        const countdownSeconds = new TimeField({ label: t('gobos.countdownDuration'), value: gobo.countdownSeconds, min: 0, max: 24 * 3600, labels: timePickerLabels() });
        countdownSeconds.onChange((value) => change({ countdownSeconds: value }));
        const countdownTime = new TextField({ label: t('gobos.countdownTime'), value: gobo.countdownTime, maxLength: 5 });
        countdownTime.onInput((value) => {
            if (/^\d{1,2}:\d{2}$/.test(value)) {
                change({ countdownTime: value });
            }
        });
        countdownSeconds.element.hidden = gobo.countdownMode !== 'duration';
        countdownTime.element.hidden = gobo.countdownMode !== 'time';
        const countdownMode = choice(t('gobos.countdown'), ['duration', 'time'] as const, gobo.countdownMode, (value) => t(`gobos.countdownModes.${value}`), (value) => {
            countdownSeconds.element.hidden = value !== 'duration';
            countdownTime.element.hidden = value !== 'time';
            return { countdownMode: value };
        });

        const remove = new Key({ label: t('common.delete'), icon: 'trash-2', armed: true });
        remove.onPress(() => void askChoice(t('gobos.deleteTitle'), t('gobos.deleteConfirm', { name: gobo.name }), [
            { id: 'cancel', label: t('common.cancel') },
            { id: 'delete', label: t('common.delete'), destructive: true, primary: true }
        ]).then((answer) => {
            if (answer === 'delete') {
                this.selected = null;
                void engine().request('video.deleteGobo', { id: gobo.id }).catch(showError);
            }
        }));

        const section = (title: string, ...children: Component[]): Stack =>
            new Stack({ gap: 1, children: [new Label({ text: title, size: 'small', weight: 'medium' }), new Stack({ direction: 'row', gap: 2, wrap: true, align: 'end', children })] });

        this.editor = new Stack({
            direction: 'row',
            gap: 3,
            align: 'start',
            classes: ['gobo-panel__editor'],
            children: [
                new Stack({ gap: 2, classes: ['gobo-panel__side'], children: [preview, new Label({ text: t('gobos.placeholders', { list: GOBO_PLACEHOLDERS.join(' ') }), tone: 'secondary', size: 'small' }), remove] }),
                new Stack({
                    gap: 2,
                    classes: ['gobo-panel__fields'],
                    children: [
                        new Stack({ direction: 'row', gap: 2, wrap: true, children: [name, font] }),
                        text,
                        section(t('gobos.style'),
                            choice(t('gobos.weight'), ['regular', 'bold'] as const, gobo.weight, (value) => t(`gobos.weights.${value}`), (value) => ({ weight: value })),
                            slider(t('gobos.size'), gobo.size, (value) => ({ size: Math.max(0.02, value) })),
                            swatch(t('gobos.color'), gobo.color, (color) => ({ color })),
                            swatch(t('gobos.outlineColor'), gobo.outlineColor, (outlineColor) => ({ outlineColor })),
                            slider(t('gobos.outline'), gobo.outline, (value) => ({ outline: value }), 0.2),
                            choice(t('gobos.align'), GOBO_ALIGNS, gobo.align, (value) => t(`gobos.aligns.${value}`), (value) => ({ align: value }))),
                        section(t('gobos.position'),
                            slider(t('gobos.x'), gobo.x, (value) => ({ x: value })),
                            slider(t('gobos.y'), gobo.y, (value) => ({ y: value })),
                            rotation),
                        section(t('gobos.look'),
                            mask, maskFile,
                            slider(t('gobos.maskSize'), gobo.maskSize, (value) => ({ maskSize: Math.max(0.05, value) }), 2),
                            slider(t('gobos.softness'), gobo.softness, (value) => ({ softness: value })),
                            slider(t('gobos.focus'), gobo.focus, (value) => ({ focus: value })),
                            prism,
                            slider(t('gobos.prismSpread'), gobo.prismSpread, (value) => ({ prismSpread: value }))),
                        section(t('gobos.motion'),
                            animation,
                            slider(t('matrices.speed'), gobo.speed, (value) => ({ speed: value })),
                            choice(t('matrices.direction'), GOBO_DIRECTIONS, gobo.direction, (value) => t(`matrices.directions.${value}`), (value) => ({ direction: value }))),
                        section(t('gobos.countdown'), countdownMode, countdownSeconds, countdownTime)
                    ]
                })
            ]
        });
        markEdit(remove, ...this.editor.element.querySelectorAll<HTMLElement>('.gobo-panel__fields'));
        this.editorHolder.append(this.editor);
    }

    private scheduleSave(): void {
        if (this.timer !== null) {
            window.clearTimeout(this.timer);
        }
        this.timer = window.setTimeout(() => {
            this.timer = null;
            if (this.draft !== null) {
                void engine().request('video.saveGobo', { gobo: this.draft }).catch(showError);
            }
        }, SAVE_DELAY_MS);
    }
}
