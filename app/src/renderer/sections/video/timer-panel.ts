/**
 * Timer screens of the show, in the Video section: one key per preset and
 * the editor of the chosen one, with a live preview and the commands start
 * or pause, reset, one minute more or less. Changes of the preset are saved
 * a moment after the last one.
 */

import { ChoiceKeys, Key, Label, NumberField, Panel, SelectField, Stack, TextField, TimeField } from '../../../framework/ts/index.js';
import { EFFECT_FONTS } from '../../../shared/patch/matrix-effect.js';
import { defaultTimer, TIMER_MODES, type ShowTimer, type TimerAction, type TimerMode, type TimerState } from '../../../shared/video/show-timer.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { timePickerLabels } from '../../i18n/control-labels.js';
import { t } from '../../i18n/i18n.js';
import { markEdit } from '../../show/edit-access.js';
import { engine } from '../../transport/engine.js';
import { CompositionView } from '../../video/composition-view.js';
import { ColorSwatch } from '../matrices/color-swatch.js';

const SAVE_DELAY_MS = 150;

export class TimerPanel extends Panel {
    private readonly keysRow = new Stack({ direction: 'row', gap: 1, wrap: true });
    private readonly holder = new Stack({ gap: 2 });
    private keys: Key[] = [];
    private editor: Stack | null = null;
    private preview: CompositionView | null = null;
    private startKey: Key | null = null;
    private timers: ShowTimer[] = [];
    private states: Record<string, TimerState> = {};
    private draft: ShowTimer | null = null;
    private selected: string | null = null;
    private saveTimer: number | null = null;

    constructor() {
        super({ title: t('timers.title'), classes: ['timer-panel'] });
        const add = new SelectField<string>({
            ariaLabel: t('timers.add'),
            options: [{ value: '', label: t('timers.add') }, ...TIMER_MODES.map((mode) => ({ value: mode, label: t(`timers.modes.${mode}`) }))],
            value: ''
        });
        add.onChange((mode) => {
            add.setValue('');
            if (mode === '') {
                return;
            }
            const timer = defaultTimer(crypto.randomUUID(), t(`timers.modes.${mode as TimerMode}`), mode as TimerMode);
            this.selected = timer.id;
            void engine().request('video.saveTimer', { timer }).catch(showError);
        });
        markEdit(add);
        this.append(new Stack({ direction: 'row', gap: 2, align: 'center', wrap: true, children: [this.keysRow, add] }), this.holder);
        this.track(() => {
            if (this.saveTimer !== null) {
                window.clearTimeout(this.saveTimer);
            }
        });
    }

    /**
     * Shows the presets; the editor is rebuilt only when the chosen preset changes.
     */
    show(timers: readonly ShowTimer[], states: Record<string, TimerState>): void {
        this.timers = [...timers];
        this.states = states;
        const chosen = this.timers.find((timer) => timer.id === this.selected) ?? this.timers[0] ?? null;
        const rebuild = chosen?.id !== this.draft?.id || this.editor === null;
        this.selected = chosen?.id ?? null;
        this.keys.forEach((key) => key.destroy());
        this.keys = this.timers.map((timer) => {
            const key = new Key({ label: timer.name, icon: 'timer', state: timer.id === this.selected ? 'active' : 'normal' });
            key.onPress(() => {
                this.selected = timer.id;
                this.show(this.timers, this.states);
            });
            return key;
        });
        this.keysRow.append(...this.keys);
        if (rebuild) {
            this.build(chosen);
        }
        this.applyStates(states);
    }

    /** Follows the live states (start, pause, changes) */
    applyStates(states: Record<string, TimerState>): void {
        this.states = states;
        if (this.draft !== null) {
            this.preview?.setTimers([this.draft], states);
            const running = states[this.draft.id]?.running === true;
            this.startKey?.setLabel(running ? t('timers.pause') : t('timers.start'));
            this.startKey?.setState(running ? 'active' : 'normal');
        }
    }

    private build(timer: ShowTimer | null): void {
        this.editor?.destroy();
        this.editor = null;
        this.preview = null;
        this.startKey = null;
        this.draft = timer === null ? null : { ...timer };
        if (timer === null) {
            return;
        }
        const preview = new CompositionView(['timer-panel__preview']);
        this.preview = preview;
        preview.setTimers([timer], this.states);
        preview.show([{ source: { kind: 'timer', timer: timer.id }, opacity: 1, fit: 'fill', loop: true }], 0);

        const change = (update: Partial<ShowTimer>): void => {
            if (this.draft === null) {
                return;
            }
            this.draft = { ...this.draft, ...update };
            preview.setTimers([this.draft], this.states);
            this.scheduleSave();
        };
        const yesNo = (label: string, value: boolean, apply: (value: boolean) => Partial<ShowTimer>): ChoiceKeys<'no' | 'yes'> => {
            const control = new ChoiceKeys<'no' | 'yes'>({
                label,
                options: [{ value: 'no', label: t('matrix.snakeNo') }, { value: 'yes', label: t('matrix.snakeYes') }],
                value: value ? 'yes' : 'no'
            });
            control.onChange((next) => change(apply(next === 'yes')));
            return control;
        };
        const swatch = (label: string, color: string, apply: (color: string) => Partial<ShowTimer>): ColorSwatch => {
            const control = new ColorSwatch(label, color);
            control.onChange((next) => change(apply(next)));
            return control;
        };
        const command = (label: string, action: TimerAction): Key => {
            const key = new Key({ label });
            key.onPress(() => void engine().request('video.timerCommand', { id: timer.id, action }).then((states) => this.applyStates(states)).catch(showError));
            return key;
        };

        const name = new TextField({ label: t('patch.name'), value: timer.name, maxLength: 60 });
        name.onInput((value) => change({ name: value.trim() || timer.name }));
        const label = new TextField({ label: t('timers.label'), value: timer.label, maxLength: 100 });
        label.onInput((value) => change({ label: value }));
        const font = new SelectField<string>({ label: t('matrices.font'), options: EFFECT_FONTS.map((item) => ({ value: item, label: item })), value: timer.font });
        font.onChange((value) => change({ font: value }));
        const duration = new TimeField({ label: t('timers.duration'), value: timer.duration, min: 0, max: 24 * 3600, decimals: 0, labels: timePickerLabels() });
        duration.onChange((value) => change({ duration: value }));
        const target = new TextField({ label: t('gobos.countdownTime'), value: timer.targetTime, maxLength: 5 });
        target.onInput((value) => {
            if (/^\d{1,2}:\d{2}$/.test(value)) {
                change({ targetTime: value });
            }
        });
        const warning = new NumberField({ label: t('timers.warning'), value: timer.warningSeconds, min: 0, max: 24 * 3600, unit: 's' });
        warning.onChange((value) => change({ warningSeconds: value }));
        const atZero = new ChoiceKeys<'negative' | 'stop'>({
            label: t('timers.atZero'),
            options: [{ value: 'negative', label: t('timers.negative') }, { value: 'stop', label: t('timers.stop') }],
            value: timer.atZero
        });
        atZero.onChange((value) => change({ atZero: value }));
        const background = new ChoiceKeys<'color' | 'none'>({
            label: t('timers.background'),
            options: [{ value: 'color', label: t('timers.backgroundColor') }, { value: 'none', label: t('timers.transparent') }],
            value: timer.background === '' ? 'none' : 'color'
        });
        const backgroundColor = swatch(t('timers.backgroundColor'), timer.background === '' ? '#000000' : timer.background, (color) => ({ background: color }));
        backgroundColor.element.hidden = timer.background === '';
        background.onChange((value) => {
            backgroundColor.element.hidden = value === 'none';
            change({ background: value === 'none' ? '' : backgroundColor.value });
        });

        const counting = timer.mode === 'countdown' || timer.mode === 'countdownTo';
        const fields: Stack[] = [
            new Stack({ direction: 'row', gap: 2, wrap: true, children: [name, label, font] })
        ];
        if (timer.mode === 'clock') {
            fields.push(new Stack({ direction: 'row', gap: 2, wrap: true, children: [
                yesNo(t('timers.showSeconds'), timer.showSeconds, (value) => ({ showSeconds: value })),
                yesNo(t('timers.showDate'), timer.showDate, (value) => ({ showDate: value }))
            ] }));
        }
        if (counting) {
            fields.push(new Stack({ direction: 'row', gap: 2, wrap: true, align: 'end', children: [
                timer.mode === 'countdown' ? duration : target,
                warning,
                atZero,
                yesNo(t('timers.flash'), timer.flashAtZero, (value) => ({ flashAtZero: value }))
            ] }));
        }
        fields.push(new Stack({ direction: 'row', gap: 2, wrap: true, align: 'end', children: [
            swatch(t('gobos.color'), timer.color, (color) => ({ color })),
            ...(counting ? [swatch(t('timers.warningColor'), timer.warningColor, (color) => ({ warningColor: color })), swatch(t('timers.endColor'), timer.endColor, (color) => ({ endColor: color }))] : []),
            background,
            backgroundColor
        ] }));

        const controls: Key[] = [];
        if (timer.mode === 'countdown' || timer.mode === 'stopwatch') {
            this.startKey = command(t('timers.start'), 'toggle');
            controls.push(this.startKey, command(t('timers.reset'), 'reset'));
        }
        if (counting) {
            controls.push(command(t('timers.plus'), 'plus'), command(t('timers.minus'), 'minus'));
        }
        const remove = new Key({ label: t('common.delete'), icon: 'trash-2', armed: true });
        remove.onPress(() => void askChoice(t('timers.deleteTitle'), t('timers.deleteConfirm', { name: timer.name }), [
            { id: 'cancel', label: t('common.cancel') },
            { id: 'delete', label: t('common.delete'), destructive: true, primary: true }
        ]).then((answer) => {
            if (answer === 'delete') {
                this.selected = null;
                void engine().request('video.deleteTimer', { id: timer.id }).catch(showError);
            }
        }));

        this.editor = new Stack({
            direction: 'row',
            gap: 3,
            align: 'start',
            children: [
                new Stack({ gap: 2, classes: ['gobo-panel__side'], children: [
                    preview,
                    new Label({ text: t(`timers.modes.${timer.mode}`), tone: 'secondary', size: 'small' }),
                    new Stack({ direction: 'row', gap: 1, wrap: true, children: controls }),
                    remove
                ] }),
                new Stack({ gap: 2, classes: ['gobo-panel__fields'], children: fields })
            ]
        });
        markEdit(remove, ...this.editor.element.querySelectorAll<HTMLElement>('.gobo-panel__fields'));
        this.holder.append(this.editor);
    }

    private scheduleSave(): void {
        if (this.saveTimer !== null) {
            window.clearTimeout(this.saveTimer);
        }
        this.saveTimer = window.setTimeout(() => {
            this.saveTimer = null;
            if (this.draft !== null) {
                void engine().request('video.saveTimer', { timer: this.draft }).catch(showError);
            }
        }, SAVE_DELAY_MS);
    }
}
