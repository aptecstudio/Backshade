/**
 * Testo semplice: etichette, didascalie e titoli.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Opzioni di un'etichetta */
export interface LabelOptions {
    /** Testo, già tradotto */
    text: string;
    /** Tono del colore: primario (predefinito) o secondario */
    tone?: 'primary' | 'secondary' | 'accent';
    /** Dimensione: piccola, normale (predefinita) o grande */
    size?: 'small' | 'base' | 'large';
    /** Peso: normale (predefinito) o medio */
    weight?: 'regular' | 'medium';
}

export class Label extends Component<HTMLSpanElement> {
    constructor(options: LabelOptions) {
        super(create('span', {
            classes: [
                'label',
                `label--${options.tone ?? 'primary'}`,
                `label--${options.size ?? 'base'}`,
                `label--${options.weight ?? 'regular'}`
            ],
            text: options.text
        }));
    }

    /**
     * Cambia il testo dell'etichetta.
     */
    setText(text: string): void {
        this.element.textContent = text;
    }
}
