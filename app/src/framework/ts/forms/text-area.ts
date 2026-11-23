/**
 * Multi-line text area with a label, for notes and long descriptions.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Text area options */
export interface TextAreaOptions {
    /** Label above the field, already translated */
    label: string;
    /** Initial value */
    value?: string;
    /** Visible rows (default 6) */
    rows?: number;
    /** Maximum length */
    maxLength?: number;
}

let nextId = 1;

export class TextArea extends Component<HTMLDivElement> {
    private readonly input: HTMLTextAreaElement;
    private readonly changes = new Emitter<string>();

    constructor(options: TextAreaOptions) {
        super(create('div', { classes: ['text-field'] }));

        const id = `text-area-${nextId++}`;
        this.input = create('textarea', { classes: ['text-field__input', 'text-field__input--area'], attributes: { id, spellcheck: 'false' } });
        this.input.value = options.value ?? '';
        this.input.rows = options.rows ?? 6;
        if (options.maxLength !== undefined) {
            this.input.maxLength = options.maxLength;
        }

        this.element.append(
            create('label', { classes: ['text-field__label'], attributes: { for: id }, text: options.label }),
            this.input
        );

        this.listen(this.input, 'input', () => this.changes.emit(this.input.value));
        this.track(() => this.changes.clear());
    }

    /** Current value */
    get value(): string {
        return this.input.value;
    }

    /**
     * Changes the value without notifying the listeners.
     */
    setValue(value: string): void {
        this.input.value = value;
    }

    /**
     * Registers a listener for the changes of the user.
     */
    onInput(listener: (value: string) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
