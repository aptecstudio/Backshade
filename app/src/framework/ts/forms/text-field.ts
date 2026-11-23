/**
 * Campo di testo con etichetta, per nomi, descrizioni e percorsi.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Opzioni di un campo di testo */
export interface TextFieldOptions {
    /** Etichetta sopra il campo, già tradotta */
    label: string;
    /** Valore iniziale */
    value?: string;
    /** Lunghezza massima */
    maxLength?: number;
    /** Campo in sola lettura, ad esempio per mostrare un percorso */
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
     * Porta il focus nel campo e seleziona il testo.
     */
    focus(): void {
        this.input.focus();
        this.input.select();
    }

    /**
     * Registra un listener per le modifiche dell'utente.
     */
    onInput(listener: (value: string) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
