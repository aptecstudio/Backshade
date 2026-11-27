/**
 * Key of the grid: turns a scene or chaser on and off, runs a cue action
 * or a desk command, or flashes a group or a channel while held. It is
 * active while what it controls is on.
 */

import { Key } from '../../../../framework/ts/index.js';
import type { GridWidget } from '../../../../shared/grid/grid.js';
import type { GridStore } from '../grid-store.js';
import { isMomentary, linkActive, pressLink } from '../widget-links.js';
import { markMidi } from '../../../midi/midi-target.js';
import { GridWidgetView } from './grid-widget.js';

export class KeyWidget extends GridWidgetView {
    private readonly key: Key;

    constructor(widget: GridWidget, store: GridStore) {
        super(widget, store);
        this.key = new Key({ label: '' });
        this.append(this.key);
        if (widget.link.kind !== 'none') {
            markMidi(this.key, widget.link, 'button');
        }
        if (isMomentary(widget.link)) {
            let held = false;
            const release = (): void => {
                if (held) {
                    held = false;
                    pressLink(widget.link, store, false);
                }
            };
            this.listen(this.key.element, 'pointerdown', (event) => {
                this.key.element.setPointerCapture(event.pointerId);
                held = true;
                pressLink(widget.link, store, true);
            });
            this.listen(this.key.element, 'pointerup', release);
            this.listen(this.key.element, 'pointercancel', release);
        } else {
            this.key.onPress(() => pressLink(widget.link, store, true));
        }
    }

    protected update(): void {
        this.key.setLabel(this.name);
        this.key.setState(linkActive(this.widget.link, this.store) ? 'active' : 'normal');
    }
}
