/**
 * Campo numerico con etichetta e unità, ad esempio un tempo in secondi.
 * Il valore viene verificato quando l'utente conferma (Invio o uscita dal
 * campo): fuori dai limiti viene corretto, se non è un numero torna al precedente.
 */

import { Component } from '../core/component.js';
import { clamp } from '../core/clamp.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Opzioni di un campo numerico */
export interface NumberFieldOptions {
    /** Etichetta sopra il campo, già tradotta */
    label: string;
    /** Unità mostrata accanto al valore, ad esempio "s" */
    unit?: string;
    value: number;
    min: number;
    max: number;
    /** Cifre decimali mostrate (predefinite 0) */
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

    /** Valore attuale */
    get value(): number {
        return this.current;
    }

    /**
     * Cambia il valore senza notificare i listener.
     */
    setValue(value: number): void {
        this.current = clamp(value, this.options.min, this.options.max);
        this.render();
    }

    /**
     * Registra un listener per i valori confermati dall'utente.
     */
    onChange(listener: (value: number) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    private render(): void {
        this.input.value = this.current.toFixed(this.options.decimals ?? 0);
    }

    /**
     * Legge il testo inserito; accetta sia il punto sia la virgola decimale.
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
