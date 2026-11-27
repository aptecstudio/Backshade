/**
 * Key that acts only after a long press, to avoid pressing it by mistake: a
 * ring around the icon fills while the key is held (pointer, or Enter and
 * Space on the keyboard) and the hold fires when it is full; releasing
 * before stops it. The long press can be required only in some states
 * (for example to turn a mode on, while a short press turns it off).
 */

import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { Emitter } from '../core/emitter.js';
import { Key, type KeyOptions } from './key.js';

const SVG = 'http://www.w3.org/2000/svg';

/** Hold key options */
export interface HoldKeyOptions extends KeyOptions {
    /** Time of the long press, in milliseconds (default 800) */
    holdMs?: number;
}

export class HoldKey extends Key {
    private readonly holds = new Emitter<void>();
    private readonly holdMs: number;
    private required = true;
    private timer: number | null = null;
    /** The click that ends a hold, or a click while the long press is required, is not a press */
    private swallowClick = false;

    constructor(options: HoldKeyOptions) {
        super(options);
        this.holdMs = options.holdMs ?? 800;
        this.element.classList.add('hold-key');
        this.element.style.setProperty('--hold-ms', `${this.holdMs}ms`);
        const ring = document.createElementNS(SVG, 'svg');
        ring.classList.add('hold-key__ring');
        ring.setAttribute('viewBox', '0 0 24 24');
        ring.setAttribute('aria-hidden', 'true');
        const circle = document.createElementNS(SVG, 'circle');
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '12');
        circle.setAttribute('r', '10');
        circle.setAttribute('pathLength', '100');
        ring.append(circle);
        this.element.append(create('span', { classes: ['hold-key__ring-box'], children: [ring] }));

        // Runs before the click listener of the key, so a swallowed click is never a press
        this.listen(this.element, 'click', (event) => {
            if (this.swallowClick || this.required) {
                event.stopImmediatePropagation();
                this.swallowClick = false;
            }
        }, { capture: true });
        this.listen(this.element, 'pointerdown', (event) => {
            if (event.button === 0) {
                this.start();
            }
        });
        for (const type of ['pointerup', 'pointerleave', 'pointercancel'] as const) {
            this.listen(this.element, type, () => this.cancel());
        }
        this.listen(this.element, 'keydown', (event) => {
            if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
                event.preventDefault();
                this.start();
            }
        });
        this.listen(this.element, 'keyup', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                const wasHolding = this.timer !== null;
                this.cancel();
                // Without the long press a key on the keyboard is a short press
                if (wasHolding && !this.required) {
                    this.element.click();
                }
            }
        });
        this.track(() => {
            this.cancel();
            this.holds.clear();
        });
    }

    /**
     * The long press is required (true) or a short press acts (false).
     */
    setHoldRequired(required: boolean): void {
        this.required = required;
        this.element.classList.toggle('hold-key--required', required);
    }

    /** Registers a listener for the completed long press */
    onHold(listener: () => void): Unsubscribe {
        return this.holds.subscribe(listener);
    }

    private start(): void {
        if (!this.required || this.element.disabled) {
            return;
        }
        this.cancel();
        this.element.classList.add('hold-key--holding');
        this.timer = window.setTimeout(() => {
            this.timer = null;
            this.element.classList.remove('hold-key--holding');
            this.swallowClick = true;
            this.holds.emit();
        }, this.holdMs);
    }

    private cancel(): void {
        if (this.timer !== null) {
            window.clearTimeout(this.timer);
            this.timer = null;
        }
        this.element.classList.remove('hold-key--holding');
    }
}
