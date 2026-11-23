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
    SquareKey,
    Stack,
    ValueDisplay,
    type ChannelColor,
    type FaderTick
} from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';

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
        const percent = (value: number): string => t('units.percent', { value: Math.round(value * 100) });
        const display = new ChannelDisplay({ name: sample.name, value: percent(sample.value), level: sample.value, color: sample.color });
        const fader = new Fader({ label: t('console.channel', { number }), value: sample.value, scale: sample.scale, formatValue: percent });

        fader.onChange((value) => {
            display.setValue(percent(value));
            display.setLevel(value);
        });

        return new Stack({
            gap: 2,
            align: 'center',
            classes: ['catalog-strip'],
            children: [
                display,
                new Knob({ label: t('attributes.intensity'), value: 0.5 }),
                new Stack({
                    direction: 'row',
                    gap: 1,
                    children: [
                        new SquareKey({ variant: 'flash', icon: 'zap', label: t('console.flash') }),
                        new SquareKey({ variant: 'solo', icon: 'headphones', label: t('console.solo') })
                    ]
                }),
                fader,
                new SquareKey({ variant: 'select', text: t('console.selectShort'), label: t('console.select'), on: number === 1 }),
                new Label({ text: String(number), size: 'small', weight: 'medium' })
            ]
        });
    }

    private grandMaster(): Stack {
        const percent = (value: number): string => t('units.percent', { value: Math.round(value * 100) });
        const level = new Label({ text: percent(1), size: 'small' });
        const fader = new Fader({ label: t('console.grandMaster'), value: 1, formatValue: percent });
        fader.onChange((value) => level.setText(percent(value)));

        return new Stack({
            gap: 2,
            align: 'center',
            children: [new Label({ text: t('console.grandMaster'), tone: 'secondary', size: 'small' }), fader, level]
        });
    }

    private programmerKnob(): Stack {
        const percent = (value: number): string => t('units.percent', { value: Math.round(value * 100) });
        const display = new ValueDisplay({ caption: t('attributes.intensity'), value: percent(0.85) });
        const knob = new Knob({ label: t('attributes.intensity'), value: 0.85, size: 'large', formatValue: percent });
        knob.onChange((value) => display.setValue(percent(value)));

        return new Stack({ direction: 'row', gap: 2, align: 'center', classes: ['catalog-displays'], children: [knob, display] });
    }
}
