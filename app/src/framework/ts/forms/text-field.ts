/**
 * Text field with a label, for names, descriptions and paths.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Text field options */
export interface TextFieldOptions {
    /** Label above the field, already translated */
    label: string;
    /** Initial value */
    value?: string;
    /** Maximum length */
    maxLength?: number;
    /** Read-only field, for example to show a path */
    readOnly?: boolean;
}

let nextId = 1;

export class TextField extends Component<HTMLDivElement> {
    private readonly input: HTMLInputElement;
    private readonly changes = new Emitter<string>();

    constructor(options: TextFieldOptions) {
        super(create('div', { classes: ['text-field'] }));

        const id = `text-field-${nextId++}`;
        this.input = create('input', {
            classes: ['text-field__input'],
            attributes: { id, type: 'text', spellcheck: 'false', autocomplete: 'off' }
        });
        this.input.value = options.value ?? '';
        if (options.maxLength !== undefined) {
            this.input.maxLength = options.maxLength;
        }
        this.input.readOnly = options.readOnly === true;

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
     * Moves the focus to the field and selects its text.
     */
    focus(): void {
        this.input.focus();
        this.input.select();
    }

    /**
     * Registers a listener for the changes of the user.
     */
    onInput(listener: (value: string) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
