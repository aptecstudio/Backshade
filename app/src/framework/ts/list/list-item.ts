/**
 * Clickable row of a list (for example a recent show or a template),
 * with content made of components and an optional selected state.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Row options */
export interface ListItemOptions {
    /** Row content */
    children?: Component[];
    /** Description for assistive technologies, already translated */
    label?: string;
    /** Muted row, for example for an unavailable item */
    muted?: boolean;
    /** Additional CSS classes, for example to lay out the content as table cells */
    classes?: string[];
}

export class ListItem extends Component<HTMLButtonElement> {
    private readonly presses = new Emitter<void>();

    constructor(options: ListItemOptions = {}) {
        super(create('button', {
            classes: ['list-item', ...(options.muted === true ? ['list-item--muted'] : []), ...(options.classes ?? [])],
            attributes: { type: 'button' }
        }));
        if (options.label !== undefined) {
            this.element.setAttribute('aria-label', options.label);
        }
        this.append(...(options.children ?? []));

        this.listen(this.element, 'click', () => this.presses.emit());
        this.track(() => this.presses.clear());
    }

    /**
     * Marks the row as selected.
     */
    setSelected(selected: boolean): void {
        this.element.classList.toggle('list-item--selected', selected);
        this.element.setAttribute('aria-pressed', String(selected));
    }

    /**
     * Registers a listener for row presses.
     */
    onPress(listener: () => void): Unsubscribe {
        return this.presses.subscribe(listener);
    }
}
