/**
 * Color picker of the grid: a color key for a group, which opens the color
 * wheel; the red, green and blue channels of the group follow it live.
 */

import { hexToRgb } from '../../../../framework/ts/index.js';
import type { GridWidget } from '../../../../shared/grid/grid.js';
import { ColorSwatch } from '../../matrices/color-swatch.js';
import { setGroupAttributes } from '../group-attributes.js';
import type { GridStore } from '../grid-store.js';
import { GridWidgetView } from './grid-widget.js';

export class ColorWidget extends GridWidgetView {
    private readonly swatch: ColorSwatch;

    constructor(widget: GridWidget, store: GridStore) {
        super(widget, store);
        this.swatch = new ColorSwatch('', '#ffffff');
        this.swatch.onChange((color) => {
            const rgb = hexToRgb(color);
            if (rgb !== null && widget.link.kind === 'group') {
                setGroupAttributes(store, widget.link.id, { red: rgb.r / 255, green: rgb.g / 255, blue: rgb.b / 255 });
            }
        });
        this.append(this.swatch);
    }

    protected update(): void {
        this.swatch.setLabel(this.name);
    }
}
