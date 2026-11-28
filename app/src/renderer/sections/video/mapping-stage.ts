/**
 * Picture of an output in the mapping editor: the mapped program with the
 * outlines of the shapes over it and handles dragged with mouse, pen or
 * finger or moved with the arrow keys (one pixel of the output, ten with
 * Shift). What the shapes and handles are is told by the editor. The space
 * around the output lets points go outside it. The picture can be zoomed,
 * and dragged points snap.
 */

import { Component, create, trackPointerDrag } from '../../../framework/ts/index.js';
import type { MappingPoint } from '../../../shared/video/mapping.js';
import { loadSnap, snapPoint, type SnapSettings } from './mapping-snap.js';
import { MappingZoom } from './mapping-zoom.js';

/** Space shown around the output, in parts of its size */
const AROUND = 0.1;
/** Distance within which a dragged point is caught, in screen pixels */
const REACH = 8;

const SVG = 'http://www.w3.org/2000/svg';

export interface StageShape {
    id: string;
    /** Data of an SVG path, in parts of the output */
    path: string;
    selected: boolean;
}

export interface StageHandle {
    point: MappingPoint;
    /** Numbered corner, small point, curve handle */
    style: 'corner' | 'point' | 'tangent';
    chosen?: boolean;
    text?: string;
    label: string;
}

export interface StageOverlay {
    shapes: StageShape[];
    /** Lines of a grid, as SVG path data */
    grid: string[];
    /** Lines from a point to its curve handles */
    guides: Array<[MappingPoint, MappingPoint]>;
    handles: StageHandle[];
    /** Points of the other shapes, that dragged points snap to */
    snap?: MappingPoint[];
}

export const EMPTY_OVERLAY: StageOverlay = { shapes: [], grid: [], guides: [], handles: [] };

function node(name: string, classes: string, attributes: Record<string, string>): SVGElement {
    const element = document.createElementNS(SVG, name);
    element.setAttribute('class', classes);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
}

export class MappingStage extends Component<HTMLDivElement> {
    /** The output itself, where the composition goes */
    readonly output: HTMLDivElement;
    private readonly lines: SVGSVGElement;
    private readonly frame: HTMLDivElement;
    private handles: HTMLButtonElement[] = [];
    private shown: StageHandle[] = [];
    private kind = '';
    private moved: (index: number, point: MappingPoint) => void = () => undefined;
    private pressed: (index: number) => void = () => undefined;
    private picked: (id: string) => void = () => undefined;
    readonly zoom: MappingZoom;
    snap: SnapSettings = loadSnap();
    private others: MappingPoint[] = [];
    private grid: SVGElement | null = null;
    private caught: SVGElement[] = [];

    constructor(private readonly width: number, private readonly height: number) {
        const output = create('div', { classes: ['mapping-stage__output'] });
        // The place keeps the size of the picture while it is zoomed inside it
        const place = create('div', { classes: ['mapping-stage__place'], children: [output] });
        super(create('div', { classes: ['mapping-stage'], children: [place] }));
        this.output = output;
        this.element.style.setProperty('--output-ratio', `${width} / ${height}`);
        this.element.style.setProperty('--around', String(AROUND));
        this.lines = document.createElementNS(SVG, 'svg');
        this.lines.setAttribute('class', 'mapping-stage__lines');
        this.lines.setAttribute('viewBox', '0 0 1 1');
        this.lines.setAttribute('preserveAspectRatio', 'none');
        this.frame = create('div', { classes: ['mapping-stage__frame'] });
        this.frame.append(this.lines);
        // Inside the output, so it has exactly its size
        output.append(this.frame);
        this.zoom = new MappingZoom(this.element, place, output, AROUND);
    }

    setSnap(snap: SnapSettings): void {
        this.snap = snap;
        this.drawGrid();
    }

    /** Lines of the snap grid, under the shapes */
    private drawGrid(): void {
        this.grid?.remove();
        this.grid = null;
        if (this.snap.grid) {
            const lines = (size: number, line: (at: number) => string): string =>
                Array.from({ length: Math.floor(size / this.snap.step) + 1 }, (_, index) => line(index * this.snap.step / size)).join('');
            this.grid = node('path', 'mapping-stage__snap-grid', { d: lines(this.width, (x) => `M${x} 0V1`) + lines(this.height, (y) => `M0 ${y}H1`) });
            this.lines.prepend(this.grid);
        }
    }

    /** A handle moved: its index and where it is now, in parts of the output */
    onMove(listener: (index: number, point: MappingPoint) => void): void {
        this.moved = listener;
    }

    /** A handle was pressed */
    onPress(listener: (index: number) => void): void {
        this.pressed = listener;
    }

    onPick(listener: (id: string) => void): void {
        this.picked = listener;
    }

    show({ shapes, grid, guides, handles, snap }: StageOverlay): void {
        this.others = snap ?? [];
        this.lines.replaceChildren(
            ...shapes.map((shape) => {
                const element = node('path', shape.selected ? 'mapping-stage__shape mapping-stage__shape--selected' : 'mapping-stage__shape', { d: shape.path });
                element.addEventListener('pointerdown', () => this.picked(shape.id));
                return element;
            }),
            ...grid.map((path) => node('path', 'mapping-stage__grid', { d: path })),
            ...guides.map(([from, to]) => node('line', 'mapping-stage__guide', { x1: String(from[0]), y1: String(from[1]), x2: String(to[0]), y2: String(to[1]) }))
        );
        this.drawGrid();
        this.lines.append(...this.caught);
        this.shown = handles;
        // Handles are made again only when they change kind, so the one in use keeps the focus
        const kind = handles.map((handle) => handle.style).join(' ');
        if (kind !== this.kind) {
            this.kind = kind;
            this.handles.forEach((handle) => handle.remove());
            this.handles = handles.map((_, index) => this.createHandle(index));
            this.frame.append(...this.handles);
        }
        this.handles.forEach((element, index) => {
            const handle = handles[index];
            element.className = `mapping-stage__handle mapping-stage__handle--${handle.style}${handle.chosen === true ? ' mapping-stage__handle--chosen' : ''}`;
            element.textContent = handle.text ?? '';
            element.setAttribute('aria-label', handle.label);
            element.style.setProperty('--x', String(handle.point[0]));
            element.style.setProperty('--y', String(handle.point[1]));
        });
    }

    /** Lines across the output through the edge or point caught */
    private showCaught([x, y]: [number | null, number | null]): void {
        this.caught.forEach((line) => line.remove());
        this.caught = [
            ...(x === null ? [] : [node('line', 'mapping-stage__caught', { x1: String(x), y1: '0', x2: String(x), y2: '1' })]),
            ...(y === null ? [] : [node('line', 'mapping-stage__caught', { x1: '0', y1: String(y), x2: '1', y2: String(y) })])
        ];
        this.lines.append(...this.caught);
    }

    private createHandle(index: number): HTMLButtonElement {
        const handle = create('button', { attributes: { type: 'button' } });
        handle.addEventListener('pointerdown', (event) => {
            const start = this.shown[index]?.point;
            if (event.button !== 0 || start === undefined) {
                return;
            }
            event.preventDefault();
            handle.focus({ preventScroll: true });
            this.pressed(index);
            const area = this.frame.getBoundingClientRect();
            const snaps = this.shown[index].style !== 'tangent';
            // Taken before moving, so the point does not catch where it was
            const targets = [...this.others, ...this.shown.filter((other) => other.style !== 'tangent').map((other) => other.point)]
                .filter((target) => Math.abs(target[0] - start[0]) > 1e-4 || Math.abs(target[1] - start[1]) > 1e-4);
            // The point follows the movement, without jumping under the pointer
            trackPointerDrag(handle, event, {
                move: (move) => {
                    const raw: MappingPoint = [start[0] + (move.clientX - event.clientX) / area.width, start[1] + (move.clientY - event.clientY) / area.height];
                    if (!snaps) {
                        this.moved(index, raw);
                        return;
                    }
                    const result = snapPoint(raw, targets, this.snap, [REACH / area.width, REACH / area.height], [this.snap.step / this.width, this.snap.step / this.height]);
                    this.showCaught(result.lines);
                    this.moved(index, result.point);
                },
                end: () => this.showCaught([null, null])
            });
        });
        handle.addEventListener('keydown', (event) => {
            const step = event.shiftKey ? 10 : 1;
            const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
            const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
            const at = this.shown[index]?.point;
            if ((dx !== 0 || dy !== 0) && at !== undefined) {
                event.preventDefault();
                this.moved(index, [at[0] + dx / this.width, at[1] + dy / this.height]);
            }
        });
        return handle;
    }
}
