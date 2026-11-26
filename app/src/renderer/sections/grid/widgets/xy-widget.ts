/**
 * XY pad of the grid: pan (x) and tilt (y) of the fixtures of a group.
 */

import { XyPad } from '../../../../framework/ts/index.js';
import type { GridWidget } from '../../../../shared/grid/grid.js';
import { setGroupAttributes } from '../group-attributes.js';
import type { GridStore } from '../grid-store.js';
import { GridWidgetView } from './grid-widget.js';

export class XyWidget extends GridWidgetView {
    private readonly pad: XyPad;

    constructor(widget: GridWidget, store: GridStore) {
        super(widget, store);
        this.pad = new XyPad({ label: widget.label });
        this.pad.onChange(({ x, y }) => {
            if (widget.link.kind === 'group') {
                setGroupAttributes(store, widget.link.id, { pan: x, tilt: y });
            }
        });
        this.append(this.pad);
    }

    protected update(): void {
        this.pad.element.setAttribute('aria-label', this.name);
    }
}
