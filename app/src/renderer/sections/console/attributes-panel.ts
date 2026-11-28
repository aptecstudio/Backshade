/**
 * Attributes panel of the simple console: the selected fixtures get
 * their channels on a row of faders, named after the definition; pan and
 * tilt move with two jog wheels, RGB with the color wheel. The first
 * fixture selected is the reference: the panel shows its channels and
 * values, and every move is applied to all the selected fixtures by the
 * engine. Values live in the levels of Preset A, so the raw faders of the
 * same channels move with the panel.
 */

import { ColorWheel, Label, Panel, Stack, type Rgb } from '../../../framework/ts/index.js';
import { attributeLevels, attributeValue, type AttributeChannel, type AttributeLayout } from '../../../shared/console/fixture-attributes.js';
import type { FixtureAttribute } from '../../../shared/fixtures/fixture-definition.js';
import { showError } from '../../dialogs/show-error.js';
import { colorWheelLabels } from '../../i18n/control-labels.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { AttributeStrip } from './attribute-strip.js';
import { FixtureSelector } from './fixture-selector.js';
import { PositionWheels, type PositionAxis } from './position-wheels.js';

/** Channels driven by the color wheel */
const RGB: readonly FixtureAttribute[] = ['red', 'green', 'blue'];

export class AttributesPanel extends Panel {
    private readonly selector: FixtureSelector;
    private readonly hint: Label;
    private readonly controls: Stack;
    private readonly stripsRow: Stack;
    private readonly wheels: PositionWheels;
    private readonly colorWheel: ColorWheel;
    private strips: AttributeStrip[] = [];
    private layout: AttributeLayout | null = null;
    /** Levels of Preset A on the universe of the reference fixture */
    private levels: number[] = [];
    /** Increases at every load, so an older answer is ignored */
    private loading = 0;

    constructor() {
        super({ title: t('attributesPanel.title'), classes: ['attributes-panel'] });

        this.selector = new FixtureSelector();
        this.hint = new Label({ text: t('attributesPanel.noSelection'), tone: 'secondary', size: 'small' });
        this.stripsRow = new Stack({ direction: 'row', gap: 8, classes: ['attributes-panel__strips'] });
        this.wheels = new PositionWheels();
        this.colorWheel = new ColorWheel({ value: { r: 0, g: 0, b: 0 }, labels: colorWheelLabels() });
        this.controls = new Stack({
            direction: 'row',
            gap: 12,
            align: 'start',
            classes: ['attributes-panel__controls'],
            children: [this.stripsRow, this.wheels, this.colorWheel]
        });
        this.controls.element.hidden = true;

        this.selector.onChange(() => void this.load());
        this.wheels.onMove(({ axis, delta }) => this.turn(axis, delta));
        this.colorWheel.onChange((rgb) => this.setColor(rgb));

        this.track(engine().on('console.faderChanged', ({ row, universe, channel, value }) => {
            if (row === 'a' && universe === this.layout?.universe) {
                this.levels[channel - 1] = value;
                this.render();
            }
        }));
        this.track(engine().on('console.fadersChanged', ({ row, universe, channels }) => {
            if (row === 'a' && universe === this.layout?.universe) {
                for (const [channel, value] of channels) {
                    this.levels[channel - 1] = value;
                }
                this.render();
            }
        }));
        this.track(engine().on('console.levelsChanged', () => void this.load()));

        this.append(this.selector, this.hint, this.controls);
    }

    /**
     * Loads the channels and the levels of the reference fixture.
     */
    private async load(): Promise<void> {
        const token = ++this.loading;
        const reference = this.selector.selected[0];
        let layout: AttributeLayout | null = null;
        let levels: number[] = [];
        if (reference !== undefined) {
            try {
                layout = await engine().request('console.attributeLayout', { fixture: reference });
                levels = layout === null ? [] : (await engine().request('console.getLevels', { universe: layout.universe })).a;
            } catch (error) {
                await showError(error);
            }
        }
        if (token !== this.loading) {
            return;
        }
        const sameChannels = layout !== null && this.layout !== null && layout.fixture === this.layout.fixture
            && layout.channels.length === this.layout.channels.length
            && layout.channels.every((channel, index) => channel.key === this.layout?.channels[index].key);
        this.layout = layout;
        this.levels = levels;
        if (!sameChannels) {
            this.build();
        }
        this.hint.setText(reference === undefined ? t('attributesPanel.noSelection') : t('attributesPanel.missing'));
        this.hint.element.hidden = layout !== null;
        this.controls.element.hidden = layout === null;
        this.render();
    }

    /**
     * Creates the faders of the reference fixture. Pan and tilt are on the
     * jog wheels and get no fader.
     */
    private build(): void {
        this.strips.forEach((strip) => strip.destroy());
        this.strips = [];
        for (const channel of this.layout?.channels ?? []) {
            if (channel.attribute === 'pan' || channel.attribute === 'tilt') {
                continue;
            }
            const strip = new AttributeStrip(channel);
            strip.onMove((value) => this.send({ [channel.key]: value }));
            this.strips.push(strip);
            this.stripsRow.append(strip);
        }
        this.stripsRow.element.hidden = this.strips.length === 0;
    }

    private render(): void {
        const layout = this.layout;
        if (layout === null) {
            return;
        }
        for (const strip of this.strips) {
            strip.setValue(this.value(strip.channel));
        }
        const pan = this.channel('pan');
        const tilt = this.channel('tilt');
        this.wheels.setValue('pan', pan === null ? null : this.value(pan));
        this.wheels.setValue('tilt', tilt === null ? null : this.value(tilt));
        this.wheels.element.hidden = pan === null && tilt === null;

        const rgb = this.rgbChannels();
        this.colorWheel.element.hidden = rgb === null;
        if (rgb !== null) {
            const [r, g, b] = rgb.map((channel) => Math.round(this.value(channel) * 255));
            const current = this.colorWheel.value;
            if (current.r !== r || current.g !== g || current.b !== b) {
                this.colorWheel.setValue({ r, g, b });
            }
        }
    }

    /** First channel of the reference fixture with an attribute */
    private channel(attribute: FixtureAttribute): AttributeChannel | null {
        return this.layout?.channels.find((channel) => channel.attribute === attribute) ?? null;
    }

    /** Red, green and blue channels, or null when one of them is missing */
    private rgbChannels(): AttributeChannel[] | null {
        const channels = RGB.map((attribute) => this.channel(attribute));
        return channels.every((channel) => channel !== null) ? channels as AttributeChannel[] : null;
    }

    private value(channel: AttributeChannel): number {
        return this.layout === null ? 0 : attributeValue(this.levels, this.layout.address, channel);
    }

    private turn(axis: PositionAxis, delta: number): void {
        const channel = this.channel(axis);
        if (channel !== null) {
            this.send({ [channel.key]: Math.max(0, Math.min(1, this.value(channel) + delta)) });
        }
    }

    private setColor(rgb: Rgb): void {
        const channels = this.rgbChannels();
        if (channels !== null) {
            const [red, green, blue] = channels;
            this.send({ [red.key]: rgb.r / 255, [green.key]: rgb.g / 255, [blue.key]: rgb.b / 255 });
        }
    }

    /**
     * Sends values of the reference channels to all the selected fixtures.
     * The levels of the reference are updated at once, so quick moves of a
     * wheel start from the value just sent.
     */
    private send(values: Record<string, number>): void {
        const layout = this.layout;
        if (layout === null) {
            return;
        }
        for (const [key, value] of Object.entries(values)) {
            const channel = layout.channels.find((item) => item.key === key);
            for (const [address, level] of channel === undefined ? [] : attributeLevels(layout.address, channel, value)) {
                this.levels[address - 1] = level;
            }
        }
        this.render();
        void engine().request('console.setAttributes', { fixtures: [...this.selector.selected], values }).catch(showError);
    }
}
