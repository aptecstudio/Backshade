/**
 * Knurled knob with an indicator line. It is adjusted by dragging
 * vertically (Shift for fine adjustment), with the mouse wheel or the keyboard.
 */

import { create } from '../dom/create.js';
import { trackPointerDrag } from './pointer-drag.js';
import { RangeControl, type RangeControlOptions } from './range-control.js';

/** Knob options */
export interface KnobOptions extends RangeControlOptions {
    /** Size: small (default, channel strips) or large (programmer) */
    size?: 'small' | 'large';
}

// Drag distance in pixels to cover the whole travel
const DRAG_RANGE_PX = 200;
const FINE_FACTOR = 0.1;
// Indicator rotation at the ends of the travel, in degrees
const MIN_ANGLE = -135;
const MAX_ANGLE = 135;

export class Knob extends RangeControl<HTMLDivElement> {
    constructor(options: KnobOptions) {
        const element = create('div', {
            classes: ['knob', ...(options.size === 'large' ? ['knob--large'] : [])]
        });
        super(element, options);

        element.append(create('div', { classes: ['knob__indicator'] }));
        this.listen(element, 'pointerdown', (event) => this.startDrag(event));

        this.setValue(options.value ?? 0);
    }

    protected render(value: number): void {
        const angle = MIN_ANGLE + value * (MAX_ANGLE - MIN_ANGLE);
        this.element.style.setProperty('--knob-angle', `${angle}deg`);
    }

    /**
     * Vertical drag: moving up increases the value.
     */
    private startDrag(event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        this.element.focus();

        let lastY = event.clientY;
        trackPointerDrag(this.element, event, {
            move: (moveEvent) => {
                const factor = moveEvent.shiftKey ? FINE_FACTOR : 1;
                this.changeBy(((lastY - moveEvent.clientY) / DRAG_RANGE_PX) * factor);
                lastY = moveEvent.clientY;
            }
        });
    }
}
