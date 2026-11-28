/**
 * Picture of an output in the mapping editor: the mapped program with the
 * outlines of the surfaces over it and, on the chosen one, a handle on each
 * corner or on each point of its grid, dragged with mouse, pen or finger or
 * moved with the arrow keys (one pixel of the output, ten with Shift). The
 * space around the output lets points go outside it.
 */

import { Component, create, trackPointerDrag } from '../../../framework/ts/index.js';
import { homography, meshPoint, project, type MappingPoint, type MappingSurface } from '../../../shared/video/mapping.js';
import { t } from '../../i18n/i18n.js';

/** Space shown around the output, in parts of its size */
const AROUND = 0.1;

const SVG = 'http://www.w3.org/2000/svg';

/** Pieces of each edge and grid line drawn */
const STEPS = 32;

/** What the handles move */
export type MappingHandles = 'corners' | 'mesh';

/** Handles of a surface, in parts of the output */
function handlePoints(surface: MappingSurface, mode: MappingHandles): MappingPoint[] {
    if (mode === 'corners') {
        return surface.corners;
    }
    const matrix = homography(surface.corners);
    return matrix === null || surface.mesh === undefined ? [] : surface.mesh.points.map((point) => project(matrix, point));
}

export class MappingStage extends Component<HTMLDivElement> {
    /** The output itself, where the composition goes */
    readonly output: HTMLDivElement;
    private readonly lines: SVGSVGElement;
    private readonly frame: HTMLDivElement;
    private handles: HTMLButtonElement[] = [];
    private positions: MappingPoint[] = [];
    private kind = '';
    private moved: (index: number, point: MappingPoint) => void = () => undefined;
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

    onPick(listener: (id: string) => void): void {
        this.picked = listener;
    }

    show(surfaces: MappingSurface[], selected: string | null, mode: MappingHandles): void {
        this.lines.replaceChildren(...surfaces.flatMap((surface) => this.draw(surface, surface.id === selected, mode)));
        const surface = surfaces.find((item) => item.id === selected);
        this.positions = surface === undefined ? [] : handlePoints(surface, mode);
        // Handles are made again only when their number changes, so the one in use keeps the focus
        const kind = `${mode} ${this.positions.length}`;
        if (kind !== this.kind) {
            this.kind = kind;
            this.handles.forEach((handle) => handle.remove());
            this.handles = this.positions.map((_, index) => this.createHandle(index, mode));
            this.frame.append(...this.handles);
        }
        this.handles.forEach((handle, index) => {
            handle.style.setProperty('--x', String(this.positions[index][0]));
            handle.style.setProperty('--y', String(this.positions[index][1]));
        });
    }

    /** Outline of a surface, bent as it is, and the lines of the grid being edited */
    private draw(surface: MappingSurface, selected: boolean, mode: MappingHandles): SVGElement[] {
        const matrix = homography(surface.corners);
        if (matrix === null) {
            return [];
        }
        const path = (points: MappingPoint[]): string => points.map(([u, v]) => project(matrix, meshPoint(surface.mesh, u, v)).join(',')).join(' ');
        const steps = Array.from({ length: STEPS + 1 }, (_, index) => index / STEPS);
        const outline = document.createElementNS(SVG, 'polygon');
        outline.setAttribute('class', selected ? 'mapping-stage__shape mapping-stage__shape--selected' : 'mapping-stage__shape');
        outline.setAttribute('points', path([
            ...steps.map((s): MappingPoint => [s, 0]), ...steps.map((s): MappingPoint => [1, s]),
            ...steps.map((s): MappingPoint => [1 - s, 1]), ...steps.map((s): MappingPoint => [0, 1 - s])
        ]));
        outline.addEventListener('pointerdown', () => this.picked(surface.id));
        if (!selected || mode !== 'mesh' || surface.mesh === undefined) {
            return [outline];
        }
        const { columns, rows } = surface.mesh;
        const line = (points: MappingPoint[]): SVGElement => {
            const element = document.createElementNS(SVG, 'polyline');
            element.setAttribute('class', 'mapping-stage__grid');
            element.setAttribute('points', path(points));
            return element;
        };
        return [
            outline,
            ...Array.from({ length: columns - 2 }, (_, index) => line(steps.map((s): MappingPoint => [(index + 1) / (columns - 1), s]))),
            ...Array.from({ length: rows - 2 }, (_, index) => line(steps.map((s): MappingPoint => [s, (index + 1) / (rows - 1)])))
        ];
    }

    private createHandle(index: number, mode: MappingHandles): HTMLButtonElement {
        const handle = create('button', {
            classes: ['mapping-stage__handle', ...(mode === 'mesh' ? ['mapping-stage__handle--point'] : [])],
            text: mode === 'corners' ? String(index + 1) : '',
            attributes: { type: 'button', 'aria-label': t(mode === 'corners' ? 'mapping.corner' : 'mapping.point', { number: index + 1 }) }
        });
        handle.addEventListener('pointerdown', (event) => {
            const start = this.positions[index];
            if (event.button !== 0 || start === undefined) {
                return;
            }
            event.preventDefault();
            handle.focus();
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
            const at = this.positions[index];
            if ((dx !== 0 || dy !== 0) && at !== undefined) {
                event.preventDefault();
                this.moved(index, [at[0] + dx / this.width, at[1] + dy / this.height]);
            }
        });
        return handle;
    }
}
