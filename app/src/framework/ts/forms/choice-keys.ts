/**
 * Scelta di un valore tra pochi, con una fila di tasti: il tasto del
 * valore scelto è attivo.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { Key } from '../keys/key.js';

/** Valore offerto */
export interface ChoiceOption<T extends string> {
    value: T;
    label: string;
}

/** Opzioni di una scelta a tasti */
export interface ChoiceKeysOptions<T extends string> {
    /** Etichetta sopra i tasti, già tradotta */
    label: string;
    options: readonly ChoiceOption<T>[];
    value: T;
}

export class ChoiceKeys<T extends string> extends Component<HTMLDivElement> {
    private readonly keys = new Map<T, Key>();
    private readonly changes = new Emitter<T>();
    private current: T;

    constructor(options: ChoiceKeysOptions<T>) {
        super(create('div', { classes: ['choice-keys'], attributes: { role: 'group' } }));

        this.current = options.value;
        const row = create('div', { classes: ['choice-keys__row'] });
        const label = create('span', { classes: ['text-field__label'], text: options.label });
        this.element.append(label, row);
        this.element.setAttribute('aria-label', options.label);

        for (const option of options.options) {
            const key = new Key({ label: option.label });
            key.onPress(() => {
                if (option.value !== this.current) {
                    this.setValue(option.value);
                    this.changes.emit(option.value);
                }
            });
            this.keys.set(option.value, key);
            this.adopt(key);
            row.append(key.element);
        }
        this.setValue(options.value);
        this.track(() => this.changes.clear());
    }

    /**
     * Cambia il valore scelto senza notificare i listener.
     */
    setValue(value: T): void {
        this.current = value;
        for (const [option, key] of this.keys) {
            key.setState(option === value ? 'active' : 'normal');
        }
    }

    /**
     * Registra un listener per le scelte dell'utente.
     */
    onChange(listener: (value: T) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
