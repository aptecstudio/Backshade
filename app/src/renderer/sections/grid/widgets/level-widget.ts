/**
 * Fader or knob of the grid: the level of a scene or chaser, a master, a
 * group or a raw channel, with its value. The engine sends the level back,
 * so every window shows the same position.
 */

import { Fader, Knob, Label, type RangeControl } from '../../../../framework/ts/index.js';
import type { GridWidget } from '../../../../shared/grid/grid.js';
import { bindControlValue } from '../../../preferences/control-values.js';
import type { GridStore } from '../grid-store.js';
import { linkLevel, setLinkLevel } from '../widget-links.js';
import { GridWidgetView } from './grid-widget.js';

export class LevelWidget extends GridWidgetView {
    private readonly control: RangeControl;

    constructor(widget: GridWidget, store: GridStore) {
        super(widget, store);
        const label = widget.label !== '' ? widget.label : widget.type;
        this.control = widget.type === 'fader' ? new Fader({ label, value: 0, size: 'fill' }) : new Knob({ label, value: 0 });
        const value = new Label({ text: '', size: 'small', tone: 'secondary' });
        this.track(bindControlValue(widget.type === 'fader' ? 'fader' : 'knob', this.control, { text: (text) => value.setText(text) }));
        this.control.onChange((level) => setLinkLevel(widget.link, level));
        this.append(this.control, value);
    }

    protected update(): void {
        const level = linkLevel(this.widget.link, this.store);
        this.control.element.setAttribute('aria-label', this.name);
        if (level !== null && Math.abs(level - this.control.value) > 0.002) {
            this.control.setValue(level);
        }
    }
}
