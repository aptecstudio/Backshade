/**
 * Manopola zigrinata con linea indicatrice. Si regola trascinando in
 * verticale (con Maiusc per la regolazione fine), con la rotella o la tastiera.
 */

import { create } from '../dom/create.js';
import { trackPointerDrag } from './pointer-drag.js';
import { RangeControl, type RangeControlOptions } from './range-control.js';

/** Opzioni di una manopola */
export interface KnobOptions extends RangeControlOptions {
    /** Dimensione: piccola (predefinita, strisce di canale) o grande (programmer) */
    size?: 'small' | 'large';
}

// Pixel di trascinamento per percorrere l'intera corsa
const DRAG_RANGE_PX = 200;
const FINE_FACTOR = 0.1;
// Rotazione dell'indicatore agli estremi della corsa, in gradi
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
     * Trascinamento verticale: verso l'alto aumenta il valore.
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
