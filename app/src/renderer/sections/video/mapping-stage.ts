/**
 * Picture of an output in the mapping editor: the mapped program with the
 * outlines of the surfaces over it and a handle on each corner of the chosen
 * one, dragged with mouse, pen or finger or moved with the arrow keys (one
 * pixel of the output, ten with Shift). The space around the output lets
 * corners go outside it.
 */

import { Component, create, trackPointerDrag } from '../../../framework/ts/index.js';
import { CORNER_MARGIN, type Corners, type MappingSurface } from '../../../shared/video/mapping.js';
import { t } from '../../i18n/i18n.js';

/** Space shown around the output, in parts of its size */
const AROUND = 0.1;

const SVG = 'http://www.w3.org/2000/svg';

export class MappingStage extends Component<HTMLDivElement> {
    /** The output itself, where the composition goes */
    readonly output: HTMLDivElement;
    private readonly lines: SVGSVGElement;
    private readonly handles: HTMLButtonElement[];
    private surfaces: MappingSurface[] = [];
    private selected: string | null = null;
    private moved: (corners: Corners) => void = () => undefined;
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
        this.handles = [0, 1, 2, 3].map((corner) => create('button', {
            classes: ['mapping-stage__handle'],
            text: String(corner + 1),
            attributes: { type: 'button', 'aria-label': t('mapping.corner', { number: corner + 1 }) }
        }));
        const frame = create('div', { classes: ['mapping-stage__frame'], children: this.handles });
        frame.prepend(this.lines);
        // Inside the output, so it has exactly its size
        output.append(frame);
        this.handles.forEach((handle, corner) => this.bind(handle, corner, frame));
    }

    onMove(listener: (corners: Corners) => void): void {
        this.moved = listener;
    }

    onPick(listener: (id: string) => void): void {
        this.picked = listener;
    }

    show(surfaces: MappingSurface[], selected: string | null): void {
        this.surfaces = surfaces;
        this.selected = selected;
        this.lines.replaceChildren(...surfaces.map((surface) => {
            const shape = document.createElementNS(SVG, 'polygon');
            shape.setAttribute('class', surface.id === selected ? 'mapping-stage__shape mapping-stage__shape--selected' : 'mapping-stage__shape');
            shape.setAttribute('points', surface.corners.map(([x, y]) => `${x},${y}`).join(' '));
            shape.addEventListener('pointerdown', () => this.picked(surface.id));
            return shape;
        }));
        const corners = surfaces.find((surface) => surface.id === selected)?.corners;
        this.handles.forEach((handle, corner) => {
            handle.hidden = corners === undefined;
            handle.style.setProperty('--x', String(corners?.[corner][0] ?? 0));
            handle.style.setProperty('--y', String(corners?.[corner][1] ?? 0));
        });
    }

    private corners(): Corners | null {
        const found = this.surfaces.find((surface) => surface.id === this.selected);
        return found === undefined ? null : found.corners.map(([x, y]) => [x, y]) as Corners;
    }

    private place(corner: number, x: number, y: number): void {
        const corners = this.corners();
        if (corners === null) {
            return;
        }
        const limit = (value: number): number => Math.round(Math.max(-CORNER_MARGIN, Math.min(1 + CORNER_MARGIN, value)) * 100000) / 100000;
        corners[corner] = [limit(x), limit(y)];
        this.moved(corners);
    }

    private bind(handle: HTMLButtonElement, corner: number, frame: HTMLElement): void {
        this.listen(handle, 'pointerdown', (event) => {
            const start = this.corners()?.[corner];
            if (event.button !== 0 || start === undefined) {
                return;
            }
            event.preventDefault();
            handle.focus();
            const area = frame.getBoundingClientRect();
            // The corner follows the movement, without jumping under the pointer
            trackPointerDrag(handle, event, {
                move: (move) => this.place(corner, start[0] + (move.clientX - event.clientX) / area.width, start[1] + (move.clientY - event.clientY) / area.height)
            });
        });
        this.listen(handle, 'keydown', (event) => {
            const step = event.shiftKey ? 10 : 1;
            const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
            const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
            const at = this.corners()?.[corner];
            if ((dx !== 0 || dy !== 0) && at !== undefined) {
                event.preventDefault();
                this.place(corner, at[0] + dx / this.width, at[1] + dy / this.height);
            }
        });
    }
}
