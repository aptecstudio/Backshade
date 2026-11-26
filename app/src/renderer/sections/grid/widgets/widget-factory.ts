/**
 * Creates the view of a widget of the grid from its type.
 */

import type { GridWidget } from '../../../../shared/grid/grid.js';
import type { GridStore } from '../grid-store.js';
import { ColorWidget } from './color-widget.js';
import type { GridWidgetView } from './grid-widget.js';
import { KeyWidget } from './key-widget.js';
import { LevelWidget } from './level-widget.js';
import { TextWidget } from './text-widget.js';
import { XyWidget } from './xy-widget.js';

export function createWidget(widget: GridWidget, store: GridStore): GridWidgetView {
    switch (widget.type) {
        case 'key': return new KeyWidget(widget, store);
        case 'fader':
        case 'knob': return new LevelWidget(widget, store);
        case 'colorPicker': return new ColorWidget(widget, store);
        case 'xyPad': return new XyWidget(widget, store);
        case 'label':
        case 'monitor': return new TextWidget(widget, store);
    }
}
