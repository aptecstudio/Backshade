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

/** Displayed range of a range input */
export type RangeInputRange = Pick<RangeInputOptions, 'min' | 'max' | 'decimals' | 'unit'>;

export class RangeInput extends Component<HTMLDivElement> {
    private readonly field: NumberField;
    private readonly control: RangeControl;
    private min: number;
    private max: number;

    constructor(control: RangeControl, options: RangeInputOptions) {
        super(create('div', { classes: ['range-input'] }));

        this.control = control;
        this.min = options.min ?? 0;
        this.max = options.max ?? 100;

        this.field = new NumberField({
            ariaLabel: options.label,
            value: this.toDisplay(control.value),
            min: this.min,
            max: this.max,
            decimals: options.decimals ?? 0,
            unit: options.unit
        });
        this.append(this.field);

        this.field.onChange((number) => control.setValue(this.fromDisplay(number), true));
        this.track(control.onRender((value) => this.field.setValue(this.toDisplay(value))));
    }

    /**
     * Changes the displayed range, for example from 0 to 100 % to 0 to 255.
     */
    setRange(range: RangeInputRange): void {
        this.min = range.min ?? 0;
        this.max = range.max ?? 100;
        this.field.setRange({ min: this.min, max: this.max, decimals: range.decimals ?? 0, unit: range.unit });
        this.field.setValue(this.toDisplay(this.control.value));
    }

    private toDisplay(value: number): number {
        return this.min + value * (this.max - this.min);
    }

    private fromDisplay(number: number): number {
        return (number - this.min) / (this.max - this.min);
    }
}
