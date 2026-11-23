/**
 * Display with large digits in the accent color, for timecode and tempo.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Readout display options */
export interface ReadoutDisplayOptions {
    /** Displayed text, for example "00:12:48:20" */
    text: string;
    /** Name for assistive technologies, already translated */
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
     * Changes the displayed text.
     */
    setText(text: string): void {
        this.element.textContent = text;
    }
}
