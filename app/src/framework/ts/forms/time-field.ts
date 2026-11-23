/**
 * Time field: a key showing the time; pressing it opens the time picker
 * with the jog wheel. Used for every duration (fades, delays, step times).
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { icon } from '../icons/icon.js';
import { formatDuration } from '../time/format-duration.js';
import { pickTime, type TimePickerLabels } from '../time/time-picker.js';

/** Time field options */
export interface TimeFieldOptions {
    /** Label above the field, already translated */
    label: string;
    /** Value in seconds */
    value: number;
    min: number;
    max: number;
    /** Decimal digits of the seconds (default 1) */
    decimals?: number;
    /** Texts of the time picker */
    labels: TimePickerLabels;
}

let nextId = 1;

export class TimeField extends Component<HTMLDivElement> {
    private readonly button: HTMLButtonElement;
    private readonly text: HTMLSpanElement;
    private readonly changes = new Emitter<number>();
    private readonly options: TimeFieldOptions;
    private current: number;

    constructor(options: TimeFieldOptions) {
        super(create('div', { classes: ['text-field', 'time-field'] }));

        this.options = options;
        this.current = options.value;
        const id = `time-field-${nextId++}`;
        this.text = create('span', { classes: ['time-field__value'] });
        this.button = create('button', {
            classes: ['time-field__button'],
            attributes: { id, type: 'button' },
            children: [icon('timer'), this.text]
        });
        this.element.append(create('label', { classes: ['text-field__label'], attributes: { for: id }, text: options.label }), this.button);

        this.render();
        this.listen(this.button, 'click', () => void this.open());
        this.track(() => this.changes.clear());
    }

    /** Current value, in seconds */
    get value(): number {
        return this.current;
    }

    /**
     * Changes the value without notifying the listeners.
     */
    setValue(seconds: number): void {
        this.current = seconds;
        this.render();
    }

    /**
     * Registers a listener for the values chosen by the user.
     */
    onChange(listener: (seconds: number) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    private render(): void {
        this.text.textContent = formatDuration(this.current, this.options.decimals ?? 1);
    }

    private async open(): Promise<void> {
        const chosen = await pickTime({
            title: this.options.label,
            value: this.current,
            min: this.options.min,
            max: this.options.max,
            decimals: this.options.decimals,
            labels: this.options.labels
        });
        if (chosen !== null && chosen !== this.current) {
            this.setValue(chosen);
            this.changes.emit(chosen);
        }
    }
}
