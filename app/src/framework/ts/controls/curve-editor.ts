/**
 * Curve from 0 to 1 on both axes, drawn through points. When editable, a
 * press on an empty place adds a point, points are dragged with mouse, pen
 * or finger, and a long press removes one; the first and last stay at the
 * sides. Without points the curve only shows a given shape.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { onLongPress } from '../dom/long-press.js';
import { trackPointerDrag } from './pointer-drag.js';

/** Point of the curve: across and up, both from 0 to 1 */
export type CurveEditorPoint = [number, number];

export interface CurveEditorOptions {
    /** Name for assistive technologies, already translated */
    label: string;
    /** Most points that can be added */
    maxPoints?: number;
}

const SVG = 'http://www.w3.org/2000/svg';
const SIZE = 100;
/** Samples of a shape shown without points */
const SAMPLES = 40;
/** Distance, as a part of the area, within which a press takes a point */
const REACH = 0.08;

function node(name: string, classes: string): SVGElement {
    const element = document.createElementNS(SVG, name);
    element.setAttribute('class', classes);
    return element;
}

export class CurveEditor extends Component<HTMLDivElement> {
    private readonly line = node('polyline', 'curve-editor__line');
    private readonly dots = node('g', 'curve-editor__points');
    private readonly changes = new Emitter<CurveEditorPoint[]>();
    private readonly max: number;
    private points: CurveEditorPoint[] = [];
    private editable = false;

    constructor(options: CurveEditorOptions) {
        super(create('div', { classes: ['curve-editor'], attributes: { role: 'img', 'aria-label': options.label } }));
        this.max = options.maxPoints ?? 32;
        const svg = document.createElementNS(SVG, 'svg');
        svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        const grid = node('path', 'curve-editor__grid');
        grid.setAttribute('d', [25, 50, 75].map((at) => `M${at} 0V${SIZE}M0 ${at}H${SIZE}`).join(''));
        svg.append(grid, this.line, this.dots);
        this.element.append(svg);

        this.listen(this.element, 'pointerdown', (event) => this.press(event));
        this.track(onLongPress(this.element, (event) => this.remove(event)));
        this.track(() => this.changes.clear());
    }

    /** Points of the curve moved by the user */
    onChange(listener: (points: CurveEditorPoint[]) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    /** Shows an editable curve through points */
    setPoints(points: readonly CurveEditorPoint[]): void {
        this.editable = true;
        this.points = points.map(([x, y]) => [x, y]);
        this.element.classList.add('curve-editor--editable');
        this.draw(this.points);
    }

    /** Shows a shape that cannot be edited */
    setShape(shape: (x: number) => number): void {
        this.editable = false;
        this.points = [];
        this.element.classList.remove('curve-editor--editable');
        this.draw(Array.from({ length: SAMPLES + 1 }, (_, index): CurveEditorPoint => [index / SAMPLES, shape(index / SAMPLES)]));
    }

    private draw(line: readonly CurveEditorPoint[]): void {
        this.line.setAttribute('points', line.map(([x, y]) => `${x * SIZE},${(1 - y) * SIZE}`).join(' '));
        this.dots.replaceChildren(...this.points.map(([x, y]) => {
            // A short line with round ends stays a circle when the area is stretched
            const dot = node('path', 'curve-editor__point');
            dot.setAttribute('d', `M${x * SIZE} ${(1 - y) * SIZE}h0.001`);
            return dot;
        }));
    }

    private position(event: PointerEvent): CurveEditorPoint {
        // The drawing, inside the padding of the area
        const area = (this.element.firstElementChild ?? this.element).getBoundingClientRect();
        const unit = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
        return [unit((event.clientX - area.left) / area.width), unit(1 - (event.clientY - area.top) / area.height)];
    }

    private near([x, y]: CurveEditorPoint): number {
        return this.points.findIndex((point) => Math.hypot(point[0] - x, point[1] - y) < REACH);
    }

    private press(event: PointerEvent): void {
        if (!this.editable || event.button !== 0) {
            return;
        }
        event.preventDefault();
        const at = this.position(event);
        let index = this.near(at);
        if (index < 0) {
            if (this.points.length >= this.max) {
                return;
            }
            const next = this.points.findIndex(([x]) => x > at[0]);
            index = next < 0 ? this.points.length - 1 : next;
            this.points.splice(index, 0, at);
            this.emit();
        }
        trackPointerDrag(this.element, event, {
            move: (moveEvent) => {
                const [x, y] = this.position(moveEvent);
                const last = this.points.length - 1;
                // A point stays between its neighbours, the ends at the sides
                const across = index === 0 ? 0 : index === last ? 1 : Math.max(this.points[index - 1][0], Math.min(this.points[index + 1][0], x));
                this.points[index] = [across, y];
                this.emit();
            }
        });
    }

    private remove(event: PointerEvent): void {
        const index = this.near(this.position(event));
        if (this.editable && index > 0 && index < this.points.length - 1) {
            this.points.splice(index, 1);
            this.emit();
        }
    }

    private emit(): void {
        this.draw(this.points);
        this.changes.emit(this.points.map(([x, y]) => [x, y]));
    }
}
