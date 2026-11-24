/**
 * One fader of the two-preset desk: the fixture and the channel it
 * controls with the DMX channel number, display with the value, compact
 * fader and flash key. The strip only
 * shows values and reports the user's actions; the desk decides the channel.
 */

import {
    CHANNEL_COLORS,
    ChannelDisplay,
    Emitter,
    Fader,
    Label,
    SquareKey,
    Stack,
    type Unsubscribe
} from '../../../framework/ts/index.js';
import type { ChannelLabel } from '../../../shared/console/preset-desk.js';
import { t } from '../../i18n/i18n.js';
import { bindControlValue } from '../../preferences/control-values.js';

const DMX_MAX = 255;

export class PresetStrip extends Stack {
    private readonly fixture: Label;
    private readonly display: ChannelDisplay;
    private readonly fader: Fader;
    private readonly number: Label;
    private readonly flash: SquareKey;
    private readonly moves = new Emitter<number>();
    private readonly flashes = new Emitter<boolean>();

    constructor() {
        super({ gap: 1, align: 'center', classes: ['preset-strip'] });

        this.fixture = new Label({ text: '', tone: 'secondary', size: 'small' });
        this.display = new ChannelDisplay({ name: '', value: '', level: 0, color: 'blue' });
        this.fader = new Fader({ label: '', value: 0, size: 'compact' });
        this.number = new Label({ text: '', tone: 'accent', size: 'small', weight: 'medium' });
        this.flash = new SquareKey({ variant: 'flash', label: '', icon: 'zap' });

        // The display above the fader shows the value: no typed field under it (decided by the human)
        this.track(bindControlValue('fader', this.fader, { text: (text) => this.display.setValue(text) }));
        this.track(this.fader.onChange((value) => this.moves.emit(Math.round(value * DMX_MAX))));
        this.track(this.fader.onRender((value) => this.display.setLevel(value)));
        this.track(this.flash.onHold((down) => {
            this.flash.setOn(down);
            this.flashes.emit(down);
        }));
        this.track(() => {
            this.moves.clear();
            this.flashes.clear();
        });

        this.append(
            new Stack({ direction: 'row', gap: 1, classes: ['preset-strip__head'], children: [this.number, this.fixture] }),
            this.display,
            this.fader,
            this.flash
        );
    }

    /**
     * Shows the channel of the strip, or hides the strip beyond the universe.
     */
    setChannel(channel: number | null, label: ChannelLabel | null): void {
        this.element.classList.toggle('preset-strip--empty', channel === null);
        if (channel === null) {
            return;
        }
        const name = label === null ? t('deskConsole.free') : `${label.number} ${label.fixture}, ${label.channel}`;
        // The fixture above the display, the channel of the fixture in the display
        this.fixture.setText(label === null ? ' ' : label.fixture);
        this.display.setName(label === null ? t('deskConsole.free') : label.channel);
        this.display.element.title = name;
        this.display.setColor(label === null ? 'blue' : CHANNEL_COLORS[label.number % CHANNEL_COLORS.length]);
        this.element.classList.toggle('preset-strip--free', label === null);
        this.number.setText(String(channel));
        const text = t('deskConsole.channel', { channel });
        this.fader.element.setAttribute('aria-label', `${text}, ${name}`);
        this.flash.element.setAttribute('aria-label', t('deskConsole.flash', { channel }));
        this.flash.element.title = name;
    }

    /**
     * Shows a level set by the engine, 0 to 255.
     */
    setValue(value: number): void {
        this.fader.setValue(value / DMX_MAX);
    }

    /** Fader moved by the user, value 0 to 255 */
    onMove(listener: (value: number) => void): Unsubscribe {
        return this.moves.subscribe(listener);
    }

    /** Flash key pressed (true) or released (false) */
    onFlash(listener: (down: boolean) => void): Unsubscribe {
        return this.flashes.subscribe(listener);
    }
}
