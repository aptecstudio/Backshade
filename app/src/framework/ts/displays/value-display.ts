/**
 * Display con didascalia e valore, ad esempio "Pan" e "212 deg".
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Opzioni di un display con valore */
export interface ValueDisplayOptions {
    /** Didascalia, già tradotta */
    caption: string;
    /** Valore già formattato */
    value: string;
}

export class ValueDisplay extends Component<HTMLDivElement> {
    private readonly valueElement: HTMLSpanElement;

    constructor(options: ValueDisplayOptions) {
        super(create('div', { classes: ['display', 'display--value'] }));

        this.valueElement = create('span', { classes: ['display__value'], text: options.value });
        this.element.append(
            create('span', { classes: ['display__caption'], text: options.caption }),
            this.valueElement
        );
    }

    /**
     * Cambia il valore mostrato.
     */
    setValue(value: string): void {
        this.valueElement.textContent = value;
    }
}
