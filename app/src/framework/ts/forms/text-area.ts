/**
 * Area di testo su più righe con etichetta, per note e descrizioni lunghe.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Opzioni di un'area di testo */
export interface TextAreaOptions {
    /** Etichetta sopra il campo, già tradotta */
    label: string;
    /** Valore iniziale */
    value?: string;
    /** Righe visibili (predefinite 6) */
    rows?: number;
    /** Lunghezza massima */
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

    /** Valore attuale */
    get value(): string {
        return this.input.value;
    }

    /**
     * Cambia il valore senza notificare i listener.
     */
    setValue(value: string): void {
        this.input.value = value;
    }

    /**
     * Registra un listener per le modifiche dell'utente.
     */
    onInput(listener: (value: string) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
