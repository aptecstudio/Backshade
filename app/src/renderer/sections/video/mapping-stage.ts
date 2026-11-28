/**
 * Picture of an output in the mapping editor: the mapped program with the
 * outlines of the shapes over it and handles dragged with mouse, pen or
 * finger or moved with the arrow keys (one pixel of the output, ten with
 * Shift). What the shapes and handles are is told by the editor. The space
 * around the output lets points go outside it.
 */

import { Component, create, trackPointerDrag } from '../../../framework/ts/index.js';
import type { MappingPoint } from '../../../shared/video/mapping.js';

/** Space shown around the output, in parts of its size */
const AROUND = 0.1;

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

    constructor(private readonly width: number, private readonly height: number) {
        const output = create('div', { classes: ['mapping-stage__output'] });
        super(create('div', { classes: ['mapping-stage'], children: [output] }));
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

    show({ shapes, grid, guides, handles }: StageOverlay): void {
        this.lines.replaceChildren(
            ...shapes.map((shape) => {
                const element = node('path', shape.selected ? 'mapping-stage__shape mapping-stage__shape--selected' : 'mapping-stage__shape', { d: shape.path });
                element.addEventListener('pointerdown', () => this.picked(shape.id));
                return element;
            }),
            ...grid.map((path) => node('path', 'mapping-stage__grid', { d: path })),
            ...guides.map(([from, to]) => node('line', 'mapping-stage__guide', { x1: String(from[0]), y1: String(from[1]), x2: String(to[0]), y2: String(to[1]) }))
        );
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

    private createHandle(index: number): HTMLButtonElement {
        const handle = create('button', { attributes: { type: 'button' } });
        handle.addEventListener('pointerdown', (event) => {
            const start = this.shown[index]?.point;
            if (event.button !== 0 || start === undefined) {
                return;
            }
            event.preventDefault();
            handle.focus();
            this.pressed(index);
            const area = this.frame.getBoundingClientRect();
            // The point follows the movement, without jumping under the pointer
            trackPointerDrag(handle, event, {
                move: (move) => this.moved(index, [start[0] + (move.clientX - event.clientX) / area.width, start[1] + (move.clientY - event.clientY) / area.height])
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
