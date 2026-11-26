/**
 * Ruler of the timeline: bar numbers and lines, beat lines when there is
 * room, the loop area and the markers. Pressing or dragging on it moves the
 * playhead.
 */

import { Component, Emitter, create, type Unsubscribe } from '../../../framework/ts/index.js';
import { beatLength, type Timeline } from '../../../shared/timeline/timeline.js';

// Least room between two numbered bars, in pixels
const MIN_BAR_LABEL = 48;

export class TimelineRuler extends Component<HTMLDivElement> {
    private readonly locates = new Emitter<number>();

    /**
     * @param pps - Pixels per second
     */
    constructor(timeline: Timeline, pps: number, loop: { start: number; end: number } | null) {
        super(create('div', { classes: ['timeline-ruler'] }));
        this.element.style.setProperty('--ruler-width', `${timeline.length * pps}px`);
        const beat = beatLength(timeline);
        const bar = beat * timeline.beatsPerBar;
        const every = Math.max(1, Math.ceil(MIN_BAR_LABEL / (bar * pps)));
        const bars = Math.ceil(timeline.length / bar);
        for (let index = 0; index <= bars; index++) {
            const tick = create('span', { classes: ['timeline-ruler__bar'], text: index % every === 0 ? String(index + 1) : '' });
            tick.style.setProperty('--tick-x', `${index * bar * pps}px`);
            this.element.append(tick);
        }
        if (loop !== null) {
            const area = create('span', { classes: ['timeline-ruler__loop'] });
            area.style.setProperty('--loop-x', `${loop.start * pps}px`);
            area.style.setProperty('--loop-w', `${(loop.end - loop.start) * pps}px`);
            this.element.append(area);
        }
        for (const marker of timeline.markers) {
            const flag = create('span', { classes: ['timeline-ruler__marker', ...(marker.stop ? ['timeline-ruler__marker--stop'] : [])], text: marker.name, attributes: { title: marker.name } });
            flag.style.setProperty('--tick-x', `${marker.time * pps}px`);
            this.element.append(flag);
        }
        this.listen(this.element, 'pointerdown', (event) => {
            this.element.setPointerCapture(event.pointerId);
            const at = (clientX: number): number => (clientX - this.element.getBoundingClientRect().left) / pps;
            this.locates.emit(at(event.clientX));
            const move = (moveEvent: PointerEvent): void => this.locates.emit(at(moveEvent.clientX));
            const up = (): void => {
                this.element.removeEventListener('pointermove', move);
                this.element.removeEventListener('pointerup', up);
            };
            this.element.addEventListener('pointermove', move);
            this.element.addEventListener('pointerup', up);
        });
        this.track(() => this.locates.clear());
    }

    /** Time pressed on the ruler, in seconds */
    onLocate(listener: (time: number) => void): Unsubscribe {
        return this.locates.subscribe(listener);
    }
}
