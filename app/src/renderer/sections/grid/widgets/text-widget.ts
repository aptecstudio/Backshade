/**
 * Label and monitor of the grid: a label shows its text; a monitor shows
 * the live value of its link (current and next cue, chaser tempo and step,
 * level of a scene, master, group or channel) on a display.
 */

import { create } from '../../../../framework/ts/index.js';
import type { GridWidget } from '../../../../shared/grid/grid.js';
import { t } from '../../../i18n/i18n.js';
import type { GridStore } from '../grid-store.js';
import { monitorText } from '../widget-links.js';
import { GridWidgetView } from './grid-widget.js';

export class TextWidget extends GridWidgetView {
    private readonly value: HTMLSpanElement | null;

    constructor(widget: GridWidget, store: GridStore) {
        super(widget, store);
        this.value = widget.type === 'monitor' ? create('span', { classes: ['grid-widget__value'] }) : null;
        if (this.value !== null) {
            this.element.append(this.value);
        }
    }

    /** A monitor of the cue list is named after the list, not after an action */
    protected get name(): string {
        if (this.widget.type === 'monitor' && this.widget.label === '' && this.widget.link.kind === 'cue') {
            return t('grid.links.cue');
        }
        return super.name;
    }

    protected update(): void {
        if (this.value !== null) {
            this.value.textContent = monitorText(this.widget.link, this.store);
        }
    }
}
