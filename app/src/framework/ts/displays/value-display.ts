/**
 * Display with caption and value, for example "Pan" and "212 deg".
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Value display options */
export interface ValueDisplayOptions {
    /** Caption, already translated */
    caption: string;
    /** Already formatted value */
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
     * Changes the displayed value.
     */
    setValue(value: string): void {
        this.valueElement.textContent = value;
    }
}
