/**
 * Riga cliccabile di un elenco (ad esempio uno show recente o un modello),
 * con contenuto fatto di componenti e uno stato selezionato opzionale.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Opzioni di una riga */
export interface ListItemOptions {
    /** Contenuto della riga */
    children?: Component[];
    /** Descrizione per le tecnologie assistive, già tradotta */
    label?: string;
    /** Riga attenuata, ad esempio per un elemento non disponibile */
    muted?: boolean;
}

export class ListItem extends Component<HTMLButtonElement> {
    private readonly presses = new Emitter<void>();

    constructor(options: ListItemOptions = {}) {
        super(create('button', {
            classes: ['list-item', ...(options.muted === true ? ['list-item--muted'] : [])],
            attributes: { type: 'button' }
        }));
        if (options.label !== undefined) {
            this.element.setAttribute('aria-label', options.label);
        }
        this.append(...(options.children ?? []));

        this.listen(this.element, 'click', () => this.presses.emit());
        this.track(() => this.presses.clear());
    }

    /**
     * Segna la riga come selezionata.
     */
    setSelected(selected: boolean): void {
        this.element.classList.toggle('list-item--selected', selected);
        this.element.setAttribute('aria-pressed', String(selected));
    }

    /**
     * Registra un listener per la pressione della riga.
     */
    onPress(listener: () => void): Unsubscribe {
        return this.presses.subscribe(listener);
    }
}
