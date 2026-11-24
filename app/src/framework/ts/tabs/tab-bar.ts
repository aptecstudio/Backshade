/**
 * Row of flat tabs, for example the navigation between sections in the
 * status bar. The active tab has the accent label and an accent bar on
 * its top edge, like the states of the console keys.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Tab */
export interface TabOption<T extends string> {
    value: T;
    /** Label, already translated */
    label: string;
}

/** Tab bar options */
export interface TabBarOptions<T extends string> {
    tabs: readonly TabOption<T>[];
    /** Active tab, or null for none */
    value: T | null;
    /** Name of the navigation for assistive technologies, already translated */
    label?: string;
}

export class TabBar<T extends string> extends Component<HTMLElement> {
    private readonly buttons = new Map<T, HTMLButtonElement>();
    private readonly changes = new Emitter<T>();

    constructor(options: TabBarOptions<T>) {
        super(create('nav', { classes: ['tab-bar'] }));
        if (options.label !== undefined) {
            this.element.setAttribute('aria-label', options.label);
        }

        for (const tab of options.tabs) {
            const button = create('button', {
                classes: ['tab-bar__tab'],
                attributes: { type: 'button' },
                children: [create('span', { classes: ['tab-bar__label'], text: tab.label })]
            });
            this.listen(button, 'click', () => this.changes.emit(tab.value));
            this.buttons.set(tab.value, button);
            this.element.append(button);
        }
        this.setValue(options.value);
        this.track(() => this.changes.clear());
    }

    /**
     * Makes a tab active without notifying the listeners; null leaves none active.
     */
    setValue(value: T | null): void {
        for (const [tab, button] of this.buttons) {
            const active = tab === value;
            button.classList.toggle('tab-bar__tab--active', active);
            if (active) {
                button.setAttribute('aria-current', 'page');
            } else {
                button.removeAttribute('aria-current');
            }
        }
    }

    /**
     * Enables or disables all the tabs.
     */
    setDisabled(disabled: boolean): void {
        for (const button of this.buttons.values()) {
            button.disabled = disabled;
        }
    }

    /**
     * Registers a listener for the tabs pressed by the user.
     */
    onChange(listener: (value: T) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
