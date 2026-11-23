/**
 * Pannello piatto che raggruppa altri componenti, con un titolo opzionale.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Opzioni di un pannello */
export interface PanelOptions {
    /** Titolo del pannello, già tradotto */
    title?: string;
    /** Classi CSS aggiuntive */
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
