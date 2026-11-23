/**
 * Square key of the channel strip: the colored outline shows the
 * function (flash, solo, select) and lights up when the key is active.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { icon } from '../icons/icon.js';
import type { IconName } from '../icons/icon-names.js';

/** Key function, which sets its color */
export type SquareKeyVariant = 'flash' | 'solo' | 'select';

/** Square key options */
export interface SquareKeyOptions {
    /** Key function */
    variant: SquareKeyVariant;
    /** Name for assistive technologies, already translated */
    label: string;
    /** Icon shown in the key */
    icon?: IconName;
    /** Short text shown in the key (lowercase), as an alternative to the icon */
    text?: string;
    /** Initial on state */
    on?: boolean;
}

export class SquareKey extends Component<HTMLButtonElement> {
    private readonly presses = new Emitter<void>();

    constructor(options: SquareKeyOptions) {
        super(create('button', {
            classes: [
                'square-key',
                `square-key--${options.variant}`,
                ...(options.text === undefined ? [] : ['square-key--wide'])
            ],
            attributes: { type: 'button', 'aria-label': options.label }
        }));

        if (options.icon !== undefined) {
            this.element.append(icon(options.icon));
        } else if (options.text !== undefined) {
            this.element.append(create('span', { classes: ['square-key__text'], text: options.text }));
        }

        this.listen(this.element, 'click', () => this.presses.emit());
        this.track(() => this.presses.clear());

        this.setOn(options.on ?? false);
    }

    /**
     * Turns the key on or off.
     */
    setOn(on: boolean): void {
        this.element.classList.toggle('square-key--on', on);
        this.element.setAttribute('aria-pressed', String(on));
    }

    /**
     * Registers a listener for key presses.
     */
    onPress(listener: () => void): Unsubscribe {
        return this.presses.subscribe(listener);
    }
}
