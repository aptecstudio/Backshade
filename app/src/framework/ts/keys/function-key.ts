/**
 * Function key: status dot and caption above (for example "F1"),
 * key with a green outline, label below.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Function key options */
export interface FunctionKeyOptions {
    /** Caption above the key, for example "F1" */
    caption: string;
    /** Label below the key, already translated */
    label: string;
    /** Initial active state */
    active?: boolean;
}

export class FunctionKey extends Component<HTMLButtonElement> {
    private readonly presses = new Emitter<void>();

    constructor(options: FunctionKeyOptions) {
        super(create('button', { classes: ['function-key'], attributes: { type: 'button' } }));

        this.element.append(
            create('span', {
                classes: ['function-key__caption'],
                children: [
                    create('span', { classes: ['function-key__dot'], attributes: { 'aria-hidden': 'true' } }),
                    document.createTextNode(options.caption)
                ]
            }),
            create('span', { classes: ['function-key__box'], attributes: { 'aria-hidden': 'true' } }),
            create('span', { classes: ['function-key__label'], text: options.label })
        );

        this.listen(this.element, 'click', () => this.presses.emit());
        this.track(() => this.presses.clear());

        this.setActive(options.active ?? false);
    }

    /**
     * Activates or deactivates the key.
     */
    setActive(active: boolean): void {
        this.element.classList.toggle('function-key--active', active);
        this.element.setAttribute('aria-pressed', String(active));
    }

    /**
     * Registers a listener for key presses.
     */
    onPress(listener: () => void): Unsubscribe {
        return this.presses.subscribe(listener);
    }
}
