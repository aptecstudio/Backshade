/**
 * Plain text: labels, captions and titles.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Label options */
export interface LabelOptions {
    /** Text, already translated */
    text: string;
    /** Color tone: primary (default) or secondary */
    tone?: 'primary' | 'secondary' | 'accent';
    /** Size: small, normal (default) or large */
    size?: 'small' | 'base' | 'large';
    /** Weight: regular (default) or medium */
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
     * Changes the label text.
     */
    setText(text: string): void {
        this.element.textContent = text;
    }
}
