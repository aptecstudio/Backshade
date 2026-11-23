/**
 * Modal dialog: title, content and action keys.
 * Esc cancels it; the focus stays inside the dialog while it is open and
 * goes back to the previous element when it closes.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Dialog options */
export interface DialogOptions {
    /** Title, already translated */
    title: string;
    /** Width: normal (default) or wide */
    size?: 'normal' | 'wide';
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]';
let nextId = 1;

export class Dialog extends Component<HTMLDivElement> {
    private readonly body: HTMLDivElement;
    private readonly actions: HTMLDivElement;
    private readonly cancels = new Emitter<void>();
    private previousFocus: Element | null = null;

    constructor(options: DialogOptions) {
        super(create('div', { classes: ['dialog-overlay'] }));

        const titleId = `dialog-title-${nextId++}`;
        this.body = create('div', { classes: ['dialog__body'] });
        this.actions = create('div', { classes: ['dialog__actions'] });
        const panel = create('div', {
            classes: ['dialog', ...(options.size === 'wide' ? ['dialog--wide'] : [])],
            attributes: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
            children: [
                create('h2', { classes: ['dialog__title'], attributes: { id: titleId }, text: options.title }),
                this.body,
                this.actions
            ]
        });
        this.element.append(panel);

        this.listen(this.element, 'keydown', (event) => this.handleKey(event, panel));
        this.track(() => this.cancels.clear());
    }

    /**
     * Shows the dialog over the page and moves the focus to the first control.
     */
    open(): this {
        this.previousFocus = document.activeElement;
        this.mount(document.body);
        const first = this.element.querySelector<HTMLElement>(`.dialog__body ${FOCUSABLE}`)
            ?? this.element.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();
        return this;
    }

    /**
     * Closes and destroys the dialog, moving the focus back where it was.
     */
    close(): void {
        const previous = this.previousFocus;
        this.destroy();
        if (previous instanceof HTMLElement) {
            previous.focus();
        }
    }

    /**
     * Adds the action keys, at the bottom right.
     */
    addActions(...actions: Component[]): this {
        for (const action of actions) {
            this.adopt(action);
            this.actions.append(action.element);
        }
        return this;
    }

    /**
     * Registers a listener for cancellation with Esc.
     */
    onCancel(listener: () => void): Unsubscribe {
        return this.cancels.subscribe(listener);
    }

    protected override get contentElement(): HTMLElement {
        return this.body;
    }

    /**
     * Esc cancels; Tab cycles through the controls of the dialog.
     */
    private handleKey(event: KeyboardEvent, panel: HTMLElement): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.cancels.emit();
            return;
        }
        if (event.key !== 'Tab') {
            return;
        }
        const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (focusable.length === 0) {
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
}
