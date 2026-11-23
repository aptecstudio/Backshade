/**
 * Tasto quadrato della striscia di canale: il contorno colorato indica la
 * funzione (flash, solo, select) e si accende quando il tasto è attivo.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { icon } from '../icons/icon.js';
import type { IconName } from '../icons/icon-names.js';

/** Funzione del tasto, che ne determina il colore */
export type SquareKeyVariant = 'flash' | 'solo' | 'select';

/** Opzioni di un tasto quadrato */
export interface SquareKeyOptions {
    /** Funzione del tasto */
    variant: SquareKeyVariant;
    /** Nome per le tecnologie assistive, già tradotto */
    label: string;
    /** Icona mostrata nel tasto */
    icon?: IconName;
    /** Testo breve mostrato nel tasto (in minuscolo), in alternativa all'icona */
    text?: string;
    /** Stato iniziale acceso */
    on?: boolean;
}

export class SquareKey extends Component<HTMLButtonElement> {
    private readonly presses = new Emitter<void>();

    constructor(options: SquareKeyOptions) {
        super(create('button', {
            classes: [
                'square-key',
                `square-key--${options.variant}`,
                ...(options.text === undefined ? [] : ['square-key--wide'])
            ],
            attributes: { type: 'button', 'aria-label': options.label }
        }));

        if (options.icon !== undefined) {
            this.element.append(icon(options.icon));
        } else if (options.text !== undefined) {
            this.element.append(create('span', { classes: ['square-key__text'], text: options.text }));
        }

        this.listen(this.element, 'click', () => this.presses.emit());
        this.track(() => this.presses.clear());

        this.setOn(options.on ?? false);
    }

    /**
     * Accende o spegne il tasto.
     */
    setOn(on: boolean): void {
        this.element.classList.toggle('square-key--on', on);
        this.element.setAttribute('aria-pressed', String(on));
    }

    /**
     * Registra un listener per la pressione del tasto.
     */
    onPress(listener: () => void): Unsubscribe {
        return this.presses.subscribe(listener);
    }
}
