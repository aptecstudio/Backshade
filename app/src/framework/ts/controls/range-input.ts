/**
 * Number field bound to a continuous control (fader, knob, slider): the
 * value can be typed on the keyboard and both stay in sync. The displayed
 * number is converted from and to the 0 to 1 value of the control.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';
import { NumberField } from '../forms/number-field.js';
import type { RangeControl } from './range-control.js';

/** Range input options */
export interface RangeInputOptions {
    /** Name for assistive technologies, already translated */
    label: string;
    /** Displayed range, for example 0 to 100 for a percentage (default) or 0 to 255 for DMX */
    min?: number;
    max?: number;
    /** Decimal digits shown (default 0) */
    decimals?: number;
    /** Unit shown next to the number, for example "%" */
    unit?: string;
}

export class RangeInput extends Component<HTMLDivElement> {
    private readonly field: NumberField;

    constructor(control: RangeControl, options: RangeInputOptions) {
        super(create('div', { classes: ['range-input'] }));

        const min = options.min ?? 0;
        const max = options.max ?? 100;
        const toDisplay = (value: number): number => min + value * (max - min);
        const fromDisplay = (number: number): number => (number - min) / (max - min);

        this.field = new NumberField({
            ariaLabel: options.label,
            value: toDisplay(control.value),
            min,
            max,
            decimals: options.decimals ?? 0,
            unit: options.unit
        });
        this.append(this.field);

        this.field.onChange((number) => control.setValue(fromDisplay(number), true));
        this.track(control.onRender((value) => this.field.setValue(toDisplay(value))));
    }
}
