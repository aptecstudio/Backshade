/**
 * Box to check with its text, on one row. The whole row is the control, large
 * enough for a finger.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

export interface CheckboxOptions {
    /** Text beside the box, already translated */
    label: string;
    checked?: boolean;
}

export class Checkbox extends Component<HTMLLabelElement> {
    private readonly input: HTMLInputElement;
    private readonly changes = new Emitter<boolean>();

    constructor(options: CheckboxOptions) {
        const input = create('input', { classes: ['checkbox__input'], attributes: { type: 'checkbox' } });
        super(create('label', { classes: ['checkbox'], children: [input, create('span', { text: options.label })] }));
        this.input = input;
        this.input.checked = options.checked === true;
        this.listen(this.input, 'change', () => this.changes.emit(this.input.checked));
        this.track(() => this.changes.clear());
    }

    get checked(): boolean {
        return this.input.checked;
    }

    onChange(listener: (checked: boolean) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
