/**
 * Catalog section with knobs and faders, connected to the displays to
 * try dragging, mouse wheel and keyboard.
 */

import {
    AUDIO_SCALE,
    ChannelDisplay,
    Fader,
    Knob,
    Label,
    LIGHT_SCALE,
    Panel,
    RangeInput,
    SquareKey,
    Stack,
    ValueDisplay,
    type ChannelColor,
    type FaderTick
} from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { bindControlValue } from '../preferences/control-values.js';

/** Sample data of a channel strip */
interface SampleStrip {
    name: string;
    color: ChannelColor;
    scale: readonly FaderTick[];
    value: number;
}

export class ControlsSection extends Panel {
    constructor() {
        super({ title: t('catalog.controls') });

        const strips: SampleStrip[] = [
            { name: t('catalog.sample.washLeft'), color: 'blue', scale: LIGHT_SCALE, value: 0.85 },
            { name: t('catalog.sample.spot'), color: 'orange', scale: LIGHT_SCALE, value: 0.6 },
            { name: t('catalog.sample.bass'), color: 'green', scale: AUDIO_SCALE, value: 0.7 }
        ];

        this.append(new Stack({
            direction: 'row',
            gap: 4,
            align: 'start',
            children: [
                ...strips.map((strip, index) => this.strip(strip, index + 1)),
                this.grandMaster(),
                this.programmerKnob()
            ]
        }));
    }

    /**
     * Sample channel strip: display, knob, keys, fader and select.
     */
    private strip(sample: SampleStrip, number: number): Stack {
        const display = new ChannelDisplay({ name: sample.name, value: '', level: sample.value, color: sample.color });
        const fader = new Fader({ label: t('console.channel', { number }), value: sample.value, scale: sample.scale });
        const input = new RangeInput(fader, { label: t('console.channel', { number }) });
        const knob = new Knob({ label: t('attributes.intensity'), value: 0.5 });
        const knobInput = new RangeInput(knob, { label: t('attributes.intensity') });

        this.track(fader.onRender((value) => display.setLevel(value)));
        this.track(bindControlValue('fader', fader, { input, text: (text) => display.setValue(text) }));
        this.track(bindControlValue('knob', knob, { input: knobInput }));

        return new Stack({
            gap: 2,
            align: 'center',
            classes: ['catalog-strip'],
            children: [
                display,
                knob,
                knobInput,
                new Stack({
                    direction: 'row',
                    gap: 1,
                    children: [
                        new SquareKey({ variant: 'flash', icon: 'zap', label: t('console.flash') }),
                        new SquareKey({ variant: 'solo', icon: 'headphones', label: t('console.solo') })
                    ]
                }),
                fader,
                input,
                new SquareKey({ variant: 'select', text: t('console.selectShort'), label: t('console.select'), on: number === 1 }),
                new Label({ text: String(number), size: 'small', weight: 'medium' })
            ]
        });
    }

    private grandMaster(): Stack {
        const level = new Label({ text: '', size: 'small' });
        const fader = new Fader({ label: t('console.grandMaster'), value: 1 });
        this.track(bindControlValue('fader', fader, { text: (text) => level.setText(text) }));

        return new Stack({
            gap: 2,
            align: 'center',
            children: [new Label({ text: t('console.grandMaster'), tone: 'secondary', size: 'small' }), fader, level]
        });
    }

    private programmerKnob(): Stack {
        const display = new ValueDisplay({ caption: t('attributes.intensity'), value: '' });
        const knob = new Knob({ label: t('attributes.intensity'), value: 0.85, size: 'large' });
        const input = new RangeInput(knob, { label: t('attributes.intensity') });
        this.track(bindControlValue('knob', knob, { input, text: (text) => display.setValue(text) }));

        return new Stack({
            direction: 'row',
            gap: 2,
            align: 'center',
            classes: ['catalog-displays'],
            children: [knob, input, display]
        });
    }
}
