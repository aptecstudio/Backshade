/**
 * Tasto funzione: punto di stato e didascalia sopra (ad esempio "F1"),
 * tasto con contorno verde, etichetta sotto.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Opzioni di un tasto funzione */
export interface FunctionKeyOptions {
    /** Didascalia sopra il tasto, ad esempio "F1" */
    caption: string;
    /** Etichetta sotto il tasto, già tradotta */
    label: string;
    /** Stato iniziale attivo */
    active?: boolean;
}

export class FunctionKey extends Component<HTMLButtonElement> {
    private readonly presses = new Emitter<void>();

    constructor(options: FunctionKeyOptions) {
        super(create('button', { classes: ['function-key'], attributes: { type: 'button' } }));

        this.element.append(
            create('span', {
                classes: ['function-key__caption'],
                children: [
                    create('span', { classes: ['function-key__dot'], attributes: { 'aria-hidden': 'true' } }),
                    document.createTextNode(options.caption)
                ]
            }),
            create('span', { classes: ['function-key__box'], attributes: { 'aria-hidden': 'true' } }),
            create('span', { classes: ['function-key__label'], text: options.label })
        );

        this.listen(this.element, 'click', () => this.presses.emit());
        this.track(() => this.presses.clear());

        this.setActive(options.active ?? false);
    }

    /**
     * Attiva o disattiva il tasto.
     */
    setActive(active: boolean): void {
        this.element.classList.toggle('function-key--active', active);
        this.element.setAttribute('aria-pressed', String(active));
    }

    /**
     * Registra un listener per la pressione del tasto.
     */
    onPress(listener: () => void): Unsubscribe {
        return this.presses.subscribe(listener);
    }
}
