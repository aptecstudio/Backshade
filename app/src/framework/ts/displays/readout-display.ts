/**
 * Display a cifre grandi nel colore di accento, per timecode e tempo.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Opzioni di un display a cifre */
export interface ReadoutDisplayOptions {
    /** Testo mostrato, ad esempio "00:12:48:20" */
    text: string;
    /** Nome per le tecnologie assistive, già tradotto */
    label: string;
}

export class ReadoutDisplay extends Component<HTMLDivElement> {
    constructor(options: ReadoutDisplayOptions) {
        super(create('div', {
            classes: ['display', 'display--readout'],
            attributes: { role: 'status', 'aria-label': options.label },
            text: options.text
        }));
    }

    /**
     * Cambia il testo mostrato.
     */
    setText(text: string): void {
        this.element.textContent = text;
    }
}
