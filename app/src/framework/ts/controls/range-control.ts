/**
 * Base of continuous value controls (knobs and faders).
 * The value goes from 0 to 1. It handles accessibility (slider role), keyboard,
 * mouse wheel and notification of the changes made by the user.
 *
 * Derived classes build their own structure and call setValue()
 * at the end of the constructor for the first rendering.
 */

import { clamp } from '../core/clamp.js';
import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import type { Unsubscribe } from '../dom/events.js';

/** Common options of continuous value controls */
export interface RangeControlOptions {
    /** Name for assistive technologies, already translated */
    label: string;
    /** Initial value, from 0 to 1 (default 0) */
    value?: number;
    /** Value text for assistive technologies */
    formatValue?: (value: number) => string;
}

// Value change steps
const STEP = 0.01;
const PAGE_STEP = 0.1;
const WHEEL_STEP = 0.02;
const FINE_FACTOR = 0.1;

/**
 * Default value format: whole percentage.
 */
function formatPercent(value: number): string {
    return `${Math.round(value * 100)} %`;
}

export abstract class RangeControl<E extends HTMLElement = HTMLElement> extends Component<E> {
    private current = Number.NaN;
    private readonly changes = new Emitter<number>();
    private readonly renders = new Emitter<number>();
    private formatValue: (value: number) => string;

    protected constructor(element: E, options: RangeControlOptions) {
        super(element);

        this.formatValue = options.formatValue ?? formatPercent;
        element.tabIndex = 0;
        element.setAttribute('role', 'slider');
        element.setAttribute('aria-label', options.label);
        element.setAttribute('aria-valuemin', '0');
        element.setAttribute('aria-valuemax', '100');

        this.listen(element, 'keydown', (event) => this.handleKey(event));
        this.listen(element, 'wheel', (event) => {
            event.preventDefault();
            const factor = event.shiftKey ? FINE_FACTOR : 1;
            this.changeBy(-Math.sign(event.deltaY) * WHEEL_STEP * factor);
        }, { passive: false });
        this.track(() => this.changes.clear());
        this.track(() => this.renders.clear());
    }

    /** Current value, from 0 to 1 */
    get value(): number {
        return this.current;
    }

    /**
     * Sets the value. With notify false (default) the listeners are not
     * notified: it is used to update the control from the engine state.
     */
    setValue(value: number, notify = false): void {
        const next = clamp(value, 0, 1);
        if (next === this.current) {
            return;
        }
        this.current = next;
        this.render(next);
        this.element.setAttribute('aria-valuenow', String(Math.round(next * 100)));
        this.element.setAttribute('aria-valuetext', this.formatValue(next));
        this.renders.emit(next);
        if (notify) {
            this.changes.emit(next);
        }
    }

    /**
     * Registers a listener for every value change, including those set by the
     * engine without notification; used to keep bound views in sync.
     */
    onRender(listener: (value: number) => void): Unsubscribe {
        return this.renders.subscribe(listener);
    }

    /**
     * Changes the value text read by assistive technologies.
     */
    setFormatValue(format: (value: number) => string): void {
        this.formatValue = format;
        if (!Number.isNaN(this.current)) {
            this.element.setAttribute('aria-valuetext', format(this.current));
        }
    }

    /**
     * Registers a listener for value changes made by the user.
     */
    onChange(listener: (value: number) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    /**
     * Updates the control graphics for the given value.
     */
    protected abstract render(value: number): void;

    /**
     * Changes the value as a user action.
     */
    protected changeBy(delta: number): void {
        this.setValue(this.current + delta, true);
    }

    /**
     * Sets the value as a user action.
     */
    protected setFromUser(value: number): void {
        this.setValue(value, true);
    }

    /**
     * Keyboard: arrows, page up and down, home and end; with Shift the step is fine.
     */
    private handleKey(event: KeyboardEvent): void {
        const step = event.shiftKey ? STEP * FINE_FACTOR : STEP;

        switch (event.key) {
            case 'ArrowUp':
            case 'ArrowRight':
                this.changeBy(step);
                break;
            case 'ArrowDown':
            case 'ArrowLeft':
                this.changeBy(-step);
                break;
            case 'PageUp':
                this.changeBy(PAGE_STEP);
                break;
            case 'PageDown':
                this.changeBy(-PAGE_STEP);
                break;
            case 'Home':
                this.setFromUser(0);
                break;
            case 'End':
                this.setFromUser(1);
                break;
            default:
                return;
        }
        event.preventDefault();
    }
}
