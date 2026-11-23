/**
 * Horizontal slider: thin track with a small cap, for values such as
 * brightness. The hit area is taller than the track, for touch use.
 */

import { create } from '../dom/create.js';
import { trackPointerDrag } from './pointer-drag.js';
import { RangeControl, type RangeControlOptions } from './range-control.js';

export class LinearSlider extends RangeControl<HTMLDivElement> {
    private readonly rail: HTMLDivElement;

    constructor(options: RangeControlOptions) {
        const element = create('div', { classes: ['slider'], attributes: { 'aria-orientation': 'horizontal' } });
        super(element, options);

        this.rail = create('div', { classes: ['slider__track'], children: [create('div', { classes: ['slider__cap'] })] });
        element.append(this.rail);
        this.listen(element, 'pointerdown', (event) => this.startDrag(event));

        this.setValue(options.value ?? 0);
    }

    /**
     * Sets the color shown at the right end of the track (the left end is black).
     */
    setTrackColor(color: string): void {
        this.element.style.setProperty('--slider-color', color);
    }

    protected render(value: number): void {
        this.element.style.setProperty('--slider-value', String(value));
    }

    private valueAt(clientX: number): number {
        const rect = this.rail.getBoundingClientRect();
        return (clientX - rect.left) / rect.width;
    }

    private startDrag(event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        this.element.focus();
        this.setFromUser(this.valueAt(event.clientX));
        trackPointerDrag(this.element, event, { move: (moveEvent) => this.setFromUser(this.valueAt(moveEvent.clientX)) });
    }
}
