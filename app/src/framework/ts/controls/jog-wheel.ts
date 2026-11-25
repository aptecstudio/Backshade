/**
 * Large jog wheel: it is turned by dragging around its center (mouse, pen
 * or finger), with the mouse wheel or with the arrow keys. It has no value
 * of its own: it reports rotation steps in turns, interpreted by its user.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { trackPointerDrag } from './pointer-drag.js';

/** Jog wheel options */
export interface JogWheelOptions {
    /** Name for assistive technologies, already translated */
    label: string;
    /** Size: normal (default) or compact, for panels with several wheels */
    size?: 'normal' | 'compact';
}

// Rotation of one mouse wheel notch and of one arrow key, in turns
const WHEEL_TURNS = 1 / 48;
const KEY_TURNS = 1 / 100;

export class JogWheel extends Component<HTMLDivElement> {
    private readonly turns = new Emitter<number>();
    private angle = 0;

    constructor(options: JogWheelOptions) {
        super(create('div', {
            classes: ['jog-wheel', ...(options.size === 'compact' ? ['jog-wheel--compact'] : [])],
            attributes: { role: 'slider', tabindex: '0', 'aria-label': options.label },
            children: [create('div', { classes: ['jog-wheel__dimple'] })]
        }));

        this.listen(this.element, 'pointerdown', (event) => this.startDrag(event));
        this.listen(this.element, 'wheel', (event) => {
            event.preventDefault();
            this.turn(-Math.sign(event.deltaY) * WHEEL_TURNS);
        }, { passive: false });
        this.listen(this.element, 'keydown', (event) => {
            const direction = event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1
                : event.key === 'ArrowDown' || event.key === 'ArrowLeft' ? -1 : 0;
            if (direction !== 0) {
                event.preventDefault();
                this.turn(direction * KEY_TURNS);
            }
        });
        this.track(() => this.turns.clear());
    }

    /**
     * Registers a listener for rotations, in turns (positive clockwise).
     */
    onTurn(listener: (turns: number) => void): Unsubscribe {
        return this.turns.subscribe(listener);
    }

    private turn(turns: number): void {
        this.angle += turns * 360;
        this.element.style.setProperty('--jog-angle', `${this.angle}deg`);
        this.turns.emit(turns);
    }

    /**
     * Angle of the pointer around the center, in turns.
     */
    private pointerTurns(event: PointerEvent): number {
        const rect = this.element.getBoundingClientRect();
        return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) / (2 * Math.PI);
    }

    private startDrag(event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        this.element.focus();
        let last = this.pointerTurns(event);
        trackPointerDrag(this.element, event, {
            move: (moveEvent) => {
                const current = this.pointerTurns(moveEvent);
                // Shortest difference, so crossing the left side does not jump a whole turn
                let delta = current - last;
                delta -= Math.round(delta);
                last = current;
                this.turn(delta);
            }
        });
    }
}
