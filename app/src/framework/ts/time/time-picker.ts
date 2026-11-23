/**
 * Time picker dialog: large readout, jog wheel to turn the time up and down
 * (coarse or fine), step keys and direct entry of the seconds.
 * It works the same with mouse, pen and touch.
 */

import { clamp } from '../core/clamp.js';
import { JogWheel } from '../controls/jog-wheel.js';
import { ReadoutDisplay } from '../displays/readout-display.js';
import { NumberField } from '../forms/number-field.js';
import { Key } from '../keys/key.js';
import { Stack } from '../layout/stack.js';
import { Dialog } from '../overlay/dialog.js';
import { formatDuration } from './format-duration.js';

/** Texts of the time picker, already translated */
export interface TimePickerLabels {
    ok: string;
    cancel: string;
    /** Fine adjustment key */
    fine: string;
    /** Reset to the minimum */
    reset: string;
    /** Label of the direct entry field */
    seconds: string;
    /** Name of the jog wheel for assistive technologies */
    wheel: string;
}

/** Time picker options */
export interface TimePickerOptions {
    title: string;
    /** Initial value, in seconds */
    value: number;
    min: number;
    max: number;
    /** Decimal digits of the seconds (default 1) */
    decimals?: number;
    labels: TimePickerLabels;
}

// Seconds covered by one turn of the wheel
const COARSE_SECONDS_PER_TURN = 10;
const FINE_SECONDS_PER_TURN = 1;
// Step keys, in seconds
const STEPS: readonly number[] = [-1, -0.1, 0.1, 1];

/**
 * Shows the time picker and waits for the choice: the new value in seconds,
 * or null if the user cancels.
 */
export function pickTime(options: TimePickerOptions): Promise<number | null> {
    return new Promise((resolve) => {
        const decimals = options.decimals ?? 1;
        const factor = 10 ** decimals;
        const round = (seconds: number): number => clamp(Math.round(seconds * factor) / factor, options.min, options.max);

        // The exact value is kept while turning, so slow rotations still add up
        let exact = clamp(options.value, options.min, options.max);
        let fine = false;

        const dialog = new Dialog({ title: options.title });
        const readout = new ReadoutDisplay({ text: formatDuration(exact, decimals), label: options.title });
        const wheel = new JogWheel({ label: options.labels.wheel });
        const entry = new NumberField({ label: options.labels.seconds, value: round(exact), min: options.min, max: options.max, decimals, unit: 's' });
        const fineKey = new Key({ label: options.labels.fine });
        const resetKey = new Key({ label: options.labels.reset });

        const show = (): void => {
            readout.setText(formatDuration(round(exact), decimals));
            entry.setValue(round(exact));
        };
        const set = (seconds: number): void => {
            exact = clamp(seconds, options.min, options.max);
            show();
        };

        wheel.onTurn((turns) => set(exact + turns * (fine ? FINE_SECONDS_PER_TURN : COARSE_SECONDS_PER_TURN)));
        entry.onChange((seconds) => set(seconds));
        fineKey.onPress(() => {
            fine = !fine;
            fineKey.setState(fine ? 'active' : 'normal');
        });
        resetKey.onPress(() => set(options.min));

        const steps = STEPS.map((step) => {
            const key = new Key({ label: `${step > 0 ? '+' : ''}${step} s` });
            key.onPress(() => set(round(exact) + step));
            return key;
        });

        readout.element.classList.add('time-picker__readout');
        dialog.element.classList.add('time-picker');
        dialog.append(
            readout,
            new Stack({
                direction: 'row',
                gap: 3,
                align: 'center',
                classes: ['time-picker__body'],
                children: [
                    wheel,
                    new Stack({ gap: 2, children: [entry, new Stack({ direction: 'row', gap: 1, children: [fineKey, resetKey] })] })
                ]
            }),
            new Stack({ direction: 'row', gap: 1, classes: ['time-picker__steps'], children: steps })
        );

        const finish = (value: number | null): void => {
            dialog.close();
            resolve(value);
        };
        const cancel = new Key({ label: options.labels.cancel });
        const ok = new Key({ label: options.labels.ok, state: 'active' });
        cancel.onPress(() => finish(null));
        ok.onPress(() => finish(round(exact)));
        dialog.addActions(cancel, ok);
        dialog.onCancel(() => finish(null));
        dialog.open();
        wheel.element.focus();
    });
}
