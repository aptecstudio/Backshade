/**
 * Number field with a label and a unit, for example a time in seconds.
 * The value is checked when the user confirms it (Enter or leaving the
 * field): outside the limits it is corrected, if it is not a number it goes back to the previous one.
 */

import { Component } from '../core/component.js';
import { clamp } from '../core/clamp.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Number field options */
export interface NumberFieldOptions {
    /** Label above the field, already translated */
    label: string;
    /** Unit shown next to the value, for example "s" */
    unit?: string;
    value: number;
    min: number;
    max: number;
    /** Decimal digits shown (default 0) */
    decimals?: number;
}

let nextId = 1;

export class NumberField extends Component<HTMLDivElement> {
    private readonly input: HTMLInputElement;
    private readonly changes = new Emitter<number>();
    private readonly options: NumberFieldOptions;
    private current: number;

    constructor(options: NumberFieldOptions) {
        super(create('div', { classes: ['text-field', 'number-field'] }));

        this.options = options;
        this.current = options.value;
        const id = `number-field-${nextId++}`;
        this.input = create('input', {
            classes: ['text-field__input', 'number-field__input'],
            attributes: { id, type: 'text', inputmode: 'decimal', autocomplete: 'off' }
        });

        const row = create('div', { classes: ['number-field__row'], children: [this.input] });
        if (options.unit !== undefined) {
            row.append(create('span', { classes: ['number-field__unit'], text: options.unit }));
        }
        this.element.append(create('label', { classes: ['text-field__label'], attributes: { for: id }, text: options.label }), row);

        this.render();
        this.listen(this.input, 'change', () => this.commit());
        this.listen(this.input, 'keydown', (event) => {
            if (event.key === 'Enter') {
                this.commit();
            }
        });
        this.track(() => this.changes.clear());
    }

    /** Current value */
    get value(): number {
        return this.current;
    }

    /**
     * Changes the value without notifying the listeners.
     */
    setValue(value: number): void {
        this.current = clamp(value, this.options.min, this.options.max);
        this.render();
    }

    /**
     * Registers a listener for the values confirmed by the user.
     */
    onChange(listener: (value: number) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    private render(): void {
        this.input.value = this.current.toFixed(this.options.decimals ?? 0);
    }

    /**
     * Reads the entered text; both point and comma are accepted as decimal separator.
     */
    private commit(): void {
        const parsed = Number(this.input.value.replace(',', '.').trim());
        if (this.input.value.trim() === '' || !Number.isFinite(parsed)) {
            this.render();
            return;
        }
        const factor = 10 ** (this.options.decimals ?? 0);
        const next = clamp(Math.round(parsed * factor) / factor, this.options.min, this.options.max);
        const changed = next !== this.current;
        this.current = next;
        this.render();
        if (changed) {
            this.changes.emit(next);
        }
    }
}
