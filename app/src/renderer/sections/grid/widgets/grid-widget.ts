/**
 * Base of the widgets of the grid: the frame placed on its cells, the
 * title (label, or the name of what it controls) and the update from the
 * live state.
 */

import { Component, create } from '../../../../framework/ts/index.js';
import type { GridWidget } from '../../../../shared/grid/grid.js';
import type { GridStore } from '../grid-store.js';
import { linkName } from '../widget-links.js';

export abstract class GridWidgetView extends Component<HTMLDivElement> {
    readonly widget: GridWidget;
    protected readonly store: GridStore;
    private readonly title: HTMLSpanElement;

    protected constructor(widget: GridWidget, store: GridStore) {
        const title = create('span', { classes: ['grid-widget__title'] });
        super(create('div', { classes: ['grid-widget', `grid-widget--${widget.type}`], attributes: { 'data-widget': widget.id }, children: [title] }));
        this.widget = widget;
        this.store = store;
        this.title = title;
        this.element.style.setProperty('--widget-x', String(widget.x + 1));
        this.element.style.setProperty('--widget-y', String(widget.y + 1));
        this.element.style.setProperty('--widget-w', String(widget.w));
        this.element.style.setProperty('--widget-h', String(widget.h));
    }

    /** Text of the widget */
    protected get name(): string {
        return this.widget.label !== '' ? this.widget.label : linkName(this.widget.link, this.store);
    }

    /**
     * Shows the live state.
     */
    refresh(): void {
        this.title.textContent = this.name;
        this.update();
    }

    protected abstract update(): void;
}
