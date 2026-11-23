/**
 * Long fader: thin slot, printed scale and knurled metal cap.
 * The cap is dragged without jumping; a click on the travel
 * moves the cap to that point.
 */

import { create } from '../dom/create.js';
import type { FaderTick } from './fader-scales.js';
import { trackPointerDrag } from './pointer-drag.js';
import { RangeControl, type RangeControlOptions } from './range-control.js';

/** Fader options */
export interface FaderOptions extends RangeControlOptions {
    /** Scale printed next to the slot; empty for no scale */
    scale?: readonly FaderTick[];
}

export class Fader extends RangeControl<HTMLDivElement> {
    private readonly travel: HTMLDivElement;
    private readonly cap: HTMLDivElement;

    constructor(options: FaderOptions) {
        const element = create('div', { classes: ['fader'], attributes: { 'aria-orientation': 'vertical' } });
        super(element, options);

        this.travel = create('div', { classes: ['fader__travel'] });
        for (const tick of options.scale ?? []) {
            const tickElement = create('span', { classes: ['fader__tick'], text: tick.label });
            tickElement.style.setProperty('--tick-position', String(tick.position));
            this.travel.append(tickElement);
        }
        this.cap = create('div', { classes: ['fader__cap'] });
        this.travel.append(this.cap);

        element.append(
            create('div', { classes: ['fader__hole'] }),
            create('div', { classes: ['fader__slot'] }),
            this.travel
        );
        this.listen(element, 'pointerdown', (event) => this.startDrag(event));

        this.setValue(options.value ?? 0);
    }

    protected render(value: number): void {
        this.element.style.setProperty('--fader-value', String(value));
    }

    /**
     * Converts the vertical pointer position into a value.
     */
    private valueAt(clientY: number, offset: number): number {
        const rect = this.travel.getBoundingClientRect();
        return 1 - (clientY - offset - rect.top) / rect.height;
    }

    private startDrag(event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        this.element.focus();

        // On the cap the distance from the center is kept, so it does not jump
        let offset = 0;
        if (event.target instanceof Node && this.cap.contains(event.target)) {
            const capRect = this.cap.getBoundingClientRect();
            offset = event.clientY - (capRect.top + capRect.height / 2);
        } else {
            this.setFromUser(this.valueAt(event.clientY, 0));
        }

        trackPointerDrag(this.element, event, {
            move: (moveEvent) => this.setFromUser(this.valueAt(moveEvent.clientY, offset))
        });
    }
}
