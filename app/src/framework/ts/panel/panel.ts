/**
 * Flat panel grouping other components, with an optional title.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Panel options */
export interface PanelOptions {
    /** Panel title, already translated */
    title?: string;
    /** Additional CSS classes */
    classes?: string[];
}

export class Panel extends Component<HTMLElement> {
    private readonly body: HTMLDivElement;

    constructor(options: PanelOptions = {}) {
        super(create('section', { classes: ['panel', ...(options.classes ?? [])] }));

        if (options.title !== undefined) {
            this.element.append(create('h2', { classes: ['panel__title'], text: options.title }));
        }
        this.body = create('div', { classes: ['panel__body'] });
        this.element.append(this.body);
    }

    protected override get contentElement(): HTMLElement {
        return this.body;
    }
}
