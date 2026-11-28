/**
 * Pan and tilt of the attributes panel: two jog wheels, X for pan and Y
 * for tilt, each with a display of its value. One turn moves a quarter of
 * the travel, so a 16-bit channel can be placed precisely.
 */

import { Emitter, JogWheel, Stack, ValueDisplay, type Unsubscribe } from '../../../framework/ts/index.js';
import { t } from '../../i18n/i18n.js';
import { formatControlValue } from '../../preferences/control-values.js';

/** Axis of a wheel */
export type PositionAxis = 'pan' | 'tilt';

/** Part of the travel moved by one turn of a wheel */
const TRAVEL_PER_TURN = 0.25;

interface AxisView {
    wheel: JogWheel;
    display: ValueDisplay;
    column: Stack;
}

export class PositionWheels extends Stack {
    private readonly axes: Record<PositionAxis, AxisView>;
    private readonly moves = new Emitter<{ axis: PositionAxis; delta: number }>();

    constructor() {
        super({ direction: 'row', gap: 8, classes: ['position-wheels'] });

        const axis = (name: PositionAxis): AxisView => {
            const wheel = new JogWheel({ label: t(name === 'pan' ? 'attributesPanel.panWheel' : 'attributesPanel.tiltWheel'), size: 'compact' });
            const display = new ValueDisplay({ caption: t(name === 'pan' ? 'attributesPanel.pan' : 'attributesPanel.tilt'), value: '' });
            wheel.onTurn((turns) => this.moves.emit({ axis: name, delta: turns * TRAVEL_PER_TURN }));
            const column = new Stack({ gap: 8, align: 'center', children: [display, wheel] });
            this.append(column);
            return { wheel, display, column };
        };
        this.axes = { pan: axis('pan'), tilt: axis('tilt') };
        this.track(() => this.moves.clear());
    }

    /**
     * Shows the value of an axis, 0 to 1, or hides it when the fixture does not have it.
     */
    setValue(axis: PositionAxis, value: number | null): void {
        const view = this.axes[axis];
        view.column.element.hidden = value === null;
        if (value !== null) {
            view.display.setValue(formatControlValue('fader', value));
        }
    }

    /** Wheel turned by the user: change of the value, as a part of the travel */
    onMove(listener: (move: { axis: PositionAxis; delta: number }) => void): Unsubscribe {
        return this.moves.subscribe(listener);
    }
}
