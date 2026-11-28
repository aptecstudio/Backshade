/**
 * Zoom and pan of the picture in the mapping editor: the wheel zooms around
 * the pointer, two fingers zoom and move it, dragging the picture or the
 * space around moves it. The picture grows in the layout, so handles and
 * lines keep their size.
 */

import type { MappingPoint } from '../../../shared/video/mapping.js';

const MAX_ZOOM = 4;
/** Zoom of one notch of the wheel and of the keys */
export const ZOOM_STEP = 1.25;

export class MappingZoom {
    private zoom = 1;
    /** Top left corner of the picture, in parts of its place */
    private offset: MappingPoint = [0, 0];
    /** Pointers on the picture, not on a handle */
    private readonly pointers = new Map<number, MappingPoint>();
    private changed: () => void = () => undefined;

    /**
     * @param area - Element that takes the gestures
     * @param place - Element with the size of the picture without zoom
     * @param picture - Element zoomed inside the place
     * @param around - Space shown around the picture, in parts of its size
     */
    constructor(area: HTMLElement, private readonly place: HTMLElement, private readonly picture: HTMLElement, private readonly around: number) {
        area.addEventListener('wheel', (event) => {
            event.preventDefault();
            this.zoomAt(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, this.at(event));
        }, { passive: false });
        area.addEventListener('pointerdown', (event) => {
            if ((event.target as Element).closest('button') === null) {
                // The shape under the pointer can be drawn again: the area keeps the pointer
                area.setPointerCapture(event.pointerId);
                this.pointers.set(event.pointerId, this.at(event));
            }
        });
        area.addEventListener('pointermove', (event) => this.move(event));
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
            area.addEventListener(name, (event) => this.pointers.delete(event.pointerId));
        }
    }

    onChange(listener: () => void): void {
        this.changed = listener;
    }

    /** Zooms around a point of the place, its middle without one */
    zoomAt(factor: number, [x, y]: MappingPoint = [0.5, 0.5]): void {
        const zoom = Math.max(1, Math.min(MAX_ZOOM, this.zoom * factor));
        const ratio = zoom / this.zoom;
        this.zoom = zoom;
        this.set([x - (x - this.offset[0]) * ratio, y - (y - this.offset[1]) * ratio]);
    }

    /** The whole output again */
    fit(): void {
        this.zoom = 1;
        this.set([0, 0]);
    }

    /** Position of a pointer in the place, in parts of it */
    private at(event: MouseEvent): MappingPoint {
        const rect = this.place.getBoundingClientRect();
        return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
    }

    private move(event: PointerEvent): void {
        const before = this.pointers.get(event.pointerId);
        if (before === undefined) {
            return;
        }
        const now = this.at(event);
        const other = [...this.pointers].find(([id]) => id !== event.pointerId)?.[1];
        this.pointers.set(event.pointerId, now);
        if (other === undefined) {
            this.set([this.offset[0] + now[0] - before[0], this.offset[1] + now[1] - before[1]]);
            return;
        }
        // Two fingers: the middle moves the picture, the distance zooms it
        const middle = (point: MappingPoint): MappingPoint => [(point[0] + other[0]) / 2, (point[1] + other[1]) / 2];
        const distance = (point: MappingPoint): number => Math.max(0.01, Math.hypot(point[0] - other[0], point[1] - other[1]));
        const from = middle(before);
        const to = middle(now);
        this.offset = [this.offset[0] + to[0] - from[0], this.offset[1] + to[1] - from[1]];
        this.zoomAt(distance(now) / distance(before), to);
    }

    private set(offset: MappingPoint): void {
        // The picture stays in view, with the same space around as without zoom
        const margin = this.around * (this.zoom - 1);
        this.offset = offset.map((value) => Math.max(1 - this.zoom - margin, Math.min(margin, value))) as MappingPoint;
        this.picture.style.setProperty('--zoom', String(this.zoom));
        this.picture.style.setProperty('--pan-x', String(this.offset[0]));
        this.picture.style.setProperty('--pan-y', String(this.offset[1]));
        this.changed();
    }
}
