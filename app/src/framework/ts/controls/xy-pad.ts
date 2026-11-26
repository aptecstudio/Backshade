/**
 * XY pad: a square area where a point is dragged with mouse, pen or
 * finger, for two values at once (for example pan and tilt). Values go
 * from 0 to 1, x from the left and y from the bottom; the arrow keys move
 * the point in small steps.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { trackPointerDrag } from './pointer-drag.js';

/** Point of the pad */
export interface XyValue {
    x: number;
    y: number;
}

/** XY pad options */
export interface XyPadOptions {
    /** Name for assistive technologies, already translated */
    label: string;
    value?: XyValue;
}

const KEY_STEP = 0.01;

export class XyPad extends Component<HTMLDivElement> {
    private readonly dot: HTMLDivElement;
    private readonly changes = new Emitter<XyValue>();
    private current: XyValue;

    constructor(options: XyPadOptions) {
        const dot = create('div', { classes: ['xy-pad__dot'] });
        super(create('div', {
            classes: ['xy-pad'],
            attributes: { role: 'application', tabindex: '0', 'aria-label': options.label },
            children: [create('div', { classes: ['xy-pad__cross'] }), dot]
        }));
        this.dot = dot;
        this.current = options.value ?? { x: 0.5, y: 0.5 };
        this.render();

        this.listen(this.element, 'pointerdown', (event) => {
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            this.element.focus();
            this.pick(event);
            trackPointerDrag(this.element, event, { move: (moveEvent) => this.pick(moveEvent) });
        });
        this.listen(this.element, 'keydown', (event) => {
            const dx = event.key === 'ArrowRight' ? KEY_STEP : event.key === 'ArrowLeft' ? -KEY_STEP : 0;
            const dy = event.key === 'ArrowUp' ? KEY_STEP : event.key === 'ArrowDown' ? -KEY_STEP : 0;
            if (dx !== 0 || dy !== 0) {
                event.preventDefault();
                this.set({ x: this.current.x + dx, y: this.current.y + dy });
            }
        });
        this.track(() => this.changes.clear());
    }

    get value(): XyValue {
        return { ...this.current };
    }

    /**
     * Changes the point without notifying the listeners.
     */
    setValue(value: XyValue): void {
        this.current = { x: clampUnit(value.x), y: clampUnit(value.y) };
        this.render();
    }

    /** Point moved by the user */
    onChange(listener: (value: XyValue) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    private pick(event: PointerEvent): void {
        const rect = this.element.getBoundingClientRect();
        this.set({ x: (event.clientX - rect.left) / rect.width, y: 1 - (event.clientY - rect.top) / rect.height });
    }

    private set(value: XyValue): void {
        this.setValue(value);
        this.changes.emit(this.value);
    }

    private render(): void {
        this.dot.style.setProperty('--xy-x', String(this.current.x));
        this.dot.style.setProperty('--xy-y', String(this.current.y));
    }
}

function clampUnit(value: number): number {
    return Math.min(1, Math.max(0, value));
}
