/**
 * One channel of the attributes panel: display with the channel name and
 * value, and a compact fader. Values go from 0 to 1, also for 16-bit
 * channels; the strip only shows values and reports the user's moves.
 */

import { ChannelDisplay, Emitter, Fader, Stack, type ChannelColor, type Unsubscribe } from '../../../framework/ts/index.js';
import type { AttributeChannel } from '../../../shared/console/fixture-attributes.js';
import { ATTRIBUTE_GROUPS, type AttributeGroup } from '../../../shared/fixtures/fixture-definition.js';
import { attributeLabel } from '../../fixtures/fixture-text.js';
import { bindControlValue } from '../../preferences/control-values.js';

/** Display color of each attribute group */
const GROUP_COLORS: Readonly<Record<AttributeGroup, ChannelColor>> = {
    intensity: 'yellow',
    color: 'pink',
    position: 'blue',
    beam: 'teal',
    effects: 'purple',
    control: 'orange'
};

export class AttributeStrip extends Stack {
    readonly channel: AttributeChannel;
    private readonly fader: Fader;
    private readonly moves = new Emitter<number>();

    constructor(channel: AttributeChannel) {
        super({ gap: 8, align: 'center', classes: ['attribute-strip'] });
        this.channel = channel;

        const display = new ChannelDisplay({ name: channel.name, value: '', level: 0, color: GROUP_COLORS[ATTRIBUTE_GROUPS[channel.attribute]] });
        display.element.title = `${channel.name}, ${attributeLabel(channel.attribute)}`;
        this.fader = new Fader({ label: channel.name, value: 0, size: 'compact' });

        this.track(bindControlValue('fader', this.fader, { text: (text) => display.setValue(text) }));
        this.track(this.fader.onRender((value) => display.setLevel(value)));
        this.track(this.fader.onChange((value) => this.moves.emit(value)));
        this.track(() => this.moves.clear());

        this.append(display, this.fader);
    }

    /**
     * Shows a value set by the engine, 0 to 1.
     */
    setValue(value: number): void {
        if (Math.abs(value - this.fader.value) > 1e-6) {
            this.fader.setValue(value);
        }
    }

    /** Fader moved by the user, value 0 to 1 */
    onMove(listener: (value: number) => void): Unsubscribe {
        return this.moves.subscribe(listener);
    }
}
