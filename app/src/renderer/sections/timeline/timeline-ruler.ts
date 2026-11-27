/**
 * Ruler of the timeline: bar numbers and lines, the loop area and the
 * markers. Pressing or dragging on it moves the playhead; a double click adds
 * a marker. A marker is moved by dragging it (with snap), a press without
 * dragging moves the playhead to it and a double click opens it. On touch
 * a long press does what the double click does.
 */

import { Component, Emitter, create, onLongPress, type Unsubscribe } from '../../../framework/ts/index.js';
import { beatLength, type Timeline } from '../../../shared/timeline/timeline.js';
import { snapTime } from './timeline-time.js';

// Least room between two numbered bars, in pixels
const MIN_BAR_LABEL = 48;
// Movement in pixels before a press on a marker becomes a drag
const DRAG_THRESHOLD = 4;

/** Marker moved to a time */
export interface MarkerMove {
    id: string;
    time: number;
}

export class TimelineRuler extends Component<HTMLDivElement> {
    private readonly locates = new Emitter<number>();
    private readonly adds = new Emitter<number>();
    private readonly moves = new Emitter<MarkerMove>();
    private readonly opens = new Emitter<string>();
    private readonly pps: number;

    /**
     * @param pps - Pixels per second
     * @param step - Length of a step of the grid, in seconds (zero for no snap)
     * @param editable - Markers can be added, moved and opened; otherwise a press only moves the playhead
     */
    constructor(timeline: Timeline, pps: number, loop: { start: number; end: number } | null, step: () => number, editable: () => boolean) {
        super(create('div', { classes: ['timeline-ruler'] }));
        this.pps = pps;
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
            const flag = create('span', {
                classes: ['timeline-ruler__marker', ...(marker.stop ? ['timeline-ruler__marker--stop'] : [])],
                text: marker.name,
                attributes: { title: marker.name, 'data-marker': marker.id }
            });
            flag.style.setProperty('--tick-x', `${marker.time * pps}px`);
            this.element.append(flag);
            this.listen(flag, 'pointerdown', (event) => this.dragMarker(event, flag, marker.id, marker.time, timeline.length, step, editable()));
            // Touch: a long press opens the marker, as the double click
            this.track(onLongPress(flag, () => {
                if (editable()) {
                    this.opens.emit(marker.id);
                }
            }));
            this.listen(flag, 'dblclick', (event) => {
                event.stopPropagation();
                if (editable()) {
                    this.opens.emit(marker.id);
                }
            });
        }
        this.listen(this.element, 'pointerdown', (event) => {
            this.element.setPointerCapture(event.pointerId);
            this.locates.emit(this.timeAt(event.clientX));
            const move = (moveEvent: PointerEvent): void => this.locates.emit(this.timeAt(moveEvent.clientX));
            const up = (): void => {
                this.element.removeEventListener('pointermove', move);
                this.element.removeEventListener('pointerup', up);
            };
            this.element.addEventListener('pointermove', move);
            this.element.addEventListener('pointerup', up);
        });
        this.track(onLongPress(this.element, (event) => {
            if (editable() && event.target === this.element) {
                this.adds.emit(Math.min(timeline.length, snapTime(this.timeAt(event.clientX), step())));
            }
        }));
        this.listen(this.element, 'dblclick', (event) => editable() && this.adds.emit(Math.min(timeline.length, snapTime(this.timeAt(event.clientX), step()))));
        this.track(() => {
            this.locates.clear();
            this.adds.clear();
            this.moves.clear();
            this.opens.clear();
        });
    }

    /** Time pressed on the ruler, in seconds */
    onLocate(listener: (time: number) => void): Unsubscribe {
        return this.locates.subscribe(listener);
    }

    /** Double click on the ruler: a marker is asked at a time */
    onAddMarker(listener: (time: number) => void): Unsubscribe {
        return this.adds.subscribe(listener);
    }

    /** A marker was dragged to a time */
    onMoveMarker(listener: (move: MarkerMove) => void): Unsubscribe {
        return this.moves.subscribe(listener);
    }

    /** Double click on a marker */
    onOpenMarker(listener: (id: string) => void): Unsubscribe {
        return this.opens.subscribe(listener);
    }

    private timeAt(clientX: number): number {
        return Math.max(0, (clientX - this.element.getBoundingClientRect().left) / this.pps);
    }

    private dragMarker(event: PointerEvent, flag: HTMLElement, id: string, time: number, length: number, step: () => number, editable: boolean): void {
        if (event.button !== 0) {
            return;
        }
        event.stopPropagation();
        flag.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        let dragged = false;
        let latest = time;
        const move = (moveEvent: PointerEvent): void => {
            const dx = moveEvent.clientX - startX;
            if (!editable || (!dragged && Math.abs(dx) < DRAG_THRESHOLD)) {
                return;
            }
            dragged = true;
            latest = Math.min(length, snapTime(time + dx / this.pps, step()));
            flag.style.setProperty('--tick-x', `${latest * this.pps}px`);
        };
        const up = (): void => {
            flag.removeEventListener('pointermove', move);
            flag.removeEventListener('pointerup', up);
            flag.removeEventListener('pointercancel', up);
            if (dragged) {
                this.moves.emit({ id, time: latest });
            } else {
                this.locates.emit(time);
            }
        };
        flag.addEventListener('pointermove', move);
        flag.addEventListener('pointerup', up);
        flag.addEventListener('pointercancel', up);
    }
}
