/**
 * Soft console key: label, optional icon, active status LED
 * and red bar for the armed or selected state.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { icon } from '../icons/icon.js';
import type { IconName } from '../icons/icon-names.js';

/** Visual state of a key */
export type KeyState = 'normal' | 'inactive' | 'active';

/** Key options */
export interface KeyOptions {
    /** Label, already translated */
    label: string;
    /** Icon before the label */
    icon?: IconName;
    /** Initial state (default 'normal') */
    state?: KeyState;
    /** Armed or selected state */
    armed?: boolean;
    /** Size: normal (default) or large, for example for the go key */
    size?: 'normal' | 'large';
    /** Shows only the icon: the label stays as the name for assistive technologies */
    iconOnly?: boolean;
}

export class Key extends Component<HTMLButtonElement> {
    private readonly labelElement: HTMLSpanElement;
    private readonly presses = new Emitter<void>();

    constructor(options: KeyOptions) {
        const iconOnly = options.iconOnly === true && options.icon !== undefined;
        super(create('button', {
            classes: [
                'key',
                ...(options.size === 'large' ? ['key--large'] : []),
                ...(iconOnly ? ['key--icon-only'] : [])
            ],
            attributes: { type: 'button' }
        }));

        this.labelElement = create('span', { classes: ['key__label'], text: options.label });
        if (options.icon !== undefined) {
            this.element.append(icon(options.icon));
        }
        if (iconOnly) {
            this.element.setAttribute('aria-label', options.label);
            this.element.title = options.label;
        } else {
            this.element.append(this.labelElement);
        }
        this.element.append(
            create('span', { classes: ['key__led'], attributes: { 'aria-hidden': 'true' } }),
            create('span', { classes: ['key__armed-bar'], attributes: { 'aria-hidden': 'true' } })
        );

        this.listen(this.element, 'click', () => this.presses.emit());
        this.track(() => this.presses.clear());

        this.setState(options.state ?? 'normal');
        this.setArmed(options.armed ?? false);
    }

    /**
     * Changes the key label.
     */
    setLabel(text: string): void {
        this.labelElement.textContent = text;
        if (this.element.classList.contains('key--icon-only')) {
            this.element.setAttribute('aria-label', text);
            this.element.title = text;
        }
    }

    /**
     * Changes the icon of the key, or adds one.
     */
    setIcon(name: IconName): void {
        const next = icon(name);
        const current = this.element.querySelector('svg');
        if (current === null) {
            this.element.prepend(next);
        } else {
            current.replaceWith(next);
        }
    }

    /**
     * Changes the visual state of the key.
     */
    setState(state: KeyState): void {
        this.element.classList.toggle('key--inactive', state === 'inactive');
        this.element.classList.toggle('key--active', state === 'active');
        this.element.setAttribute('aria-pressed', String(state === 'active'));
    }

    /**
     * Enables or disables the key; a disabled key cannot be pressed.
     */
    setDisabled(disabled: boolean): void {
        this.element.disabled = disabled;
    }

    /**
     * Shows or hides the armed state bar.
     */
    setArmed(armed: boolean): void {
        this.element.classList.toggle('key--armed', armed);
    }

    /**
     * Registers a listener for key presses.
     */
    onPress(listener: () => void): Unsubscribe {
        return this.presses.subscribe(listener);
    }
}
