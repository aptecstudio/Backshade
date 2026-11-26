/**
 * One page of the grid: columns x rows of square cells sized to the width
 * of the section, with the widgets on their cells. In run mode the widgets
 * work; in edit mode the empty cells add widgets, a widget is pressed to
 * change it, dragged to move it and resized from its corner.
 */

import { Component, Emitter, create, type Unsubscribe } from '../../../framework/ts/index.js';
import type { GridPage, GridWidget } from '../../../shared/grid/grid.js';
import { t } from '../../i18n/i18n.js';
import type { GridStore } from './grid-store.js';
import type { GridWidgetView } from './widgets/grid-widget.js';
import { createWidget } from './widgets/widget-factory.js';

/** Change of place or size of a widget in edit mode */
export interface WidgetPlacement {
    widget: GridWidget;
    x: number;
    y: number;
    w: number;
    h: number;
}

// Movement in pixels before a press on a widget becomes a drag
const DRAG_THRESHOLD = 6;

export class GridPageView extends Component<HTMLDivElement> {
    private readonly page: GridPage;
    private readonly views: GridWidgetView[] = [];
    private readonly adds = new Emitter<{ x: number; y: number }>();
    private readonly edits = new Emitter<GridWidget>();
    private readonly moves = new Emitter<WidgetPlacement>();

    constructor(page: GridPage, store: GridStore, editing: boolean) {
        super(create('div', { classes: ['grid-page', ...(editing ? ['grid-page--edit'] : [])] }));
        this.page = page;
        this.element.style.setProperty('--grid-columns', String(page.columns));
        this.element.style.setProperty('--grid-rows', String(page.rows));

        if (editing) {
            const used = new Set(page.widgets.flatMap((widget) => cellsOf(widget)));
            for (let y = 0; y < page.rows; y++) {
                for (let x = 0; x < page.columns; x++) {
                    if (used.has(`${x}:${y}`)) {
                        continue;
                    }
                    const cell = create('button', {
                        classes: ['grid-page__cell'],
                        attributes: { type: 'button', 'aria-label': t('grid.addAt', { column: x + 1, row: y + 1 }), title: t('grid.addWidget') }
                    });
                    cell.style.setProperty('--widget-x', String(x + 1));
                    cell.style.setProperty('--widget-y', String(y + 1));
                    this.listen(cell, 'click', () => this.adds.emit({ x, y }));
                    this.element.append(cell);
                }
            }
        }
        for (const widget of page.widgets) {
            const view = createWidget(widget, store);
            this.views.push(view);
            this.append(view);
            if (editing) {
                this.makeEditable(view);
            }
        }

        // Square cells as wide as the section allows, gaps between cells excluded
        const observer = new ResizeObserver(() => {
            this.element.style.setProperty('--cell-size', `${this.cellSize()}px`);
        });
        observer.observe(this.element);
        this.track(() => observer.disconnect());
        this.track(() => {
            this.adds.clear();
            this.edits.clear();
            this.moves.clear();
        });
        this.refresh();
    }

    /** Side of a cell in pixels */
    private cellSize(): number {
        const gap = parseFloat(getComputedStyle(this.element).columnGap) || 0;
        return (this.element.clientWidth - gap * (this.page.columns - 1)) / this.page.columns;
    }

    /** Shows the live state on every widget */
    refresh(): void {
        this.views.forEach((view) => view.refresh());
    }

    /** Empty cell pressed in edit mode */
    onAdd(listener: (cell: { x: number; y: number }) => void): Unsubscribe {
        return this.adds.subscribe(listener);
    }

    /** Widget pressed in edit mode */
    onEdit(listener: (widget: GridWidget) => void): Unsubscribe {
        return this.edits.subscribe(listener);
    }

    /** Widget moved or resized in edit mode */
    onPlace(listener: (placement: WidgetPlacement) => void): Unsubscribe {
        return this.moves.subscribe(listener);
    }

    private makeEditable(view: GridWidgetView): void {
        const handle = create('span', { classes: ['grid-widget__resize'], attributes: { 'aria-hidden': 'true' } });
        view.element.append(handle);
        this.listen(view.element, 'pointerdown', (event) => {
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            const resizing = event.target === handle;
            const start = { x: event.clientX, y: event.clientY };
            const widget = view.widget;
            let dragged = false;
            let placement: WidgetPlacement = { widget, x: widget.x, y: widget.y, w: widget.w, h: widget.h };
            view.element.setPointerCapture(event.pointerId);
            const move = (moveEvent: PointerEvent): void => {
                const dx = moveEvent.clientX - start.x;
                const dy = moveEvent.clientY - start.y;
                if (!dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
                    return;
                }
                dragged = true;
                const cell = this.cellSize() + (parseFloat(getComputedStyle(this.element).columnGap) || 0);
                const stepX = Math.round(dx / cell);
                const stepY = Math.round(dy / cell);
                placement = resizing
                    ? { widget, x: widget.x, y: widget.y, w: clamp(widget.w + stepX, 1, this.page.columns - widget.x), h: clamp(widget.h + stepY, 1, this.page.rows - widget.y) }
                    : { widget, x: clamp(widget.x + stepX, 0, this.page.columns - widget.w), y: clamp(widget.y + stepY, 0, this.page.rows - widget.h), w: widget.w, h: widget.h };
                view.element.style.setProperty('--widget-x', String(placement.x + 1));
                view.element.style.setProperty('--widget-y', String(placement.y + 1));
                view.element.style.setProperty('--widget-w', String(placement.w));
                view.element.style.setProperty('--widget-h', String(placement.h));
            };
            const finish = (): void => {
                view.element.removeEventListener('pointermove', move);
                view.element.removeEventListener('pointerup', finish);
                view.element.removeEventListener('pointercancel', finish);
                if (!dragged) {
                    this.edits.emit(widget);
                } else if (placement.x !== widget.x || placement.y !== widget.y || placement.w !== widget.w || placement.h !== widget.h) {
                    this.moves.emit(placement);
                }
            };
            view.element.addEventListener('pointermove', move);
            view.element.addEventListener('pointerup', finish);
            view.element.addEventListener('pointercancel', finish);
        });
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/** Cells taken by a widget, as "x:y" */
function cellsOf(widget: GridWidget): string[] {
    const cells: string[] = [];
    for (let y = widget.y; y < widget.y + widget.h; y++) {
        for (let x = widget.x; x < widget.x + widget.w; x++) {
            cells.push(`${x}:${y}`);
        }
    }
    return cells;
}
