/**
 * Formatting of fader and knob values according to the display preference,
 * and binding of a control, its typed value field and an optional display.
 */

import type { RangeControl, RangeInput, RangeInputRange, Unsubscribe } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { displayMode, onDisplayModeChange, type ControlKind } from './control-display.js';

const DMX_MAX = 255;

/**
 * Returns a control value (0 to 1) as text, for example "85 %" or "217".
 */
export function formatControlValue(kind: ControlKind, value: number): string {
    return displayMode(kind) === 'dmx'
        ? String(Math.round(value * DMX_MAX))
        : t('units.percent', { value: Math.round(value * 100) });
}

/**
 * Displayed range of the typed value field.
 */
export function controlRange(kind: ControlKind): RangeInputRange {
    return displayMode(kind) === 'dmx'
        ? { min: 0, max: DMX_MAX, decimals: 0, unit: '' }
        : { min: 0, max: 100, decimals: 0, unit: '%' };
}

/** Parts that show the value of a control */
export interface ControlValueViews {
    /** Typed value field bound to the control */
    input?: RangeInput;
    /** Called with the formatted value whenever the value or the preference changes */
    text?: (text: string) => void;
}

/**
 * Applies the display preference to a control and its views, now and at
 * every change of the value or of the preference.
 * @returns the function that stops following the preference
 */
export function bindControlValue(kind: ControlKind, control: RangeControl, views: ControlValueViews = {}): Unsubscribe {
    const apply = (): void => {
        control.setFormatValue((value) => formatControlValue(kind, value));
        views.input?.setRange(controlRange(kind));
        views.text?.(formatControlValue(kind, control.value));
    };
    apply();

    const stopValue = control.onRender((value) => views.text?.(formatControlValue(kind, value)));
    const stopPreference = onDisplayModeChange((changed) => {
        if (changed === kind) {
            apply();
        }
    });
    return () => {
        stopValue();
        stopPreference();
    };
}
