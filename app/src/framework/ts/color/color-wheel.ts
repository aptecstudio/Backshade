/**
 * Color wheel for RGB values: hue around the wheel, saturation from the
 * center to the edge, brightness on a slider, plus R, G, B and hex fields
 * for typed values. It works the same with mouse, pen and touch.
 */

import { LinearSlider } from '../controls/linear-slider.js';
import { trackPointerDrag } from '../controls/pointer-drag.js';
import { Component } from '../core/component.js';
import { clamp } from '../core/clamp.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { NumberField } from '../forms/number-field.js';
import { TextField } from '../forms/text-field.js';
import { Stack } from '../layout/stack.js';
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv, type Hsv, type Rgb } from '../theme/color-math.js';

/** Texts of the color wheel, already translated */
export interface ColorWheelLabels {
    wheel: string;
    brightness: string;
    red: string;
    green: string;
    blue: string;
    hex: string;
}

/** Color wheel options */
export interface ColorWheelOptions {
    value: Rgb;
    labels: ColorWheelLabels;
}

export class ColorWheel extends Component<HTMLDivElement> {
    private readonly disc: HTMLDivElement;
    private readonly swatch: HTMLDivElement;
    private readonly brightness: LinearSlider;
    private readonly channels: [NumberField, NumberField, NumberField];
    private readonly hex: TextField;
    private readonly changes = new Emitter<Rgb>();
    private hsv: Hsv;

    constructor(options: ColorWheelOptions) {
        super(create('div', { classes: ['color-wheel'] }));

        this.hsv = rgbToHsv(options.value);
        this.disc = create('div', {
            classes: ['color-wheel__disc'],
            attributes: { role: 'img', 'aria-label': options.labels.wheel },
            children: [create('div', { classes: ['color-wheel__shade'] }), create('div', { classes: ['color-wheel__marker'] })]
        });
        this.swatch = create('div', { classes: ['color-wheel__swatch'], attributes: { 'aria-hidden': 'true' } });
        this.brightness = new LinearSlider({ label: options.labels.brightness, value: this.hsv.v });
        const channel = (label: string): NumberField => new NumberField({ label, value: 0, min: 0, max: 255 });
        this.channels = [channel(options.labels.red), channel(options.labels.green), channel(options.labels.blue)];
        this.hex = new TextField({ label: options.labels.hex, value: '', maxLength: 7 });

        const side = new Stack({ gap: 2, classes: ['color-wheel__side'] });
        side.append(
            new Stack({ direction: 'row', gap: 1, children: this.channels }),
            this.hex,
            this.brightness
        );
        side.element.prepend(this.swatch);
        this.element.append(this.disc);
        this.append(side);

        this.listen(this.disc, 'pointerdown', (event) => this.startDrag(event));
        this.brightness.onChange((value) => this.apply({ ...this.hsv, v: value }));
        this.channels.forEach((field, index) => field.onChange((value) => {
            const rgb = this.rgb();
            const next = { ...rgb, [(['r', 'g', 'b'] as const)[index]]: value };
            this.apply(rgbToHsv(next));
        }));
        this.hex.onInput((text) => {
            const rgb = hexToRgb(text);
            if (rgb !== null && text.replace('#', '').length === 6) {
                this.apply(rgbToHsv(rgb), false);
            }
        });
        this.track(() => this.changes.clear());

        this.render(true);
    }

    /** Current color */
    get value(): Rgb {
        return this.rgb();
    }

    /**
     * Changes the color without notifying the listeners.
     */
    setValue(rgb: Rgb): void {
        this.hsv = rgbToHsv(rgb);
        this.render(true);
    }

    /**
     * Registers a listener for the colors chosen by the user.
     */
    onChange(listener: (rgb: Rgb) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    private rgb(): Rgb {
        return hsvToRgb(this.hsv);
    }

    /**
     * Applies a color chosen by the user and notifies it.
     * @param updateHex - false while the user is typing in the hex field
     */
    private apply(hsv: Hsv, updateHex = true): void {
        this.hsv = hsv;
        this.render(updateHex);
        this.changes.emit(this.rgb());
    }

    private render(updateHex: boolean): void {
        const rgb = this.rgb();
        const radians = (this.hsv.h * Math.PI) / 180;
        this.disc.style.setProperty('--marker-x', String(Math.sin(radians) * this.hsv.s));
        this.disc.style.setProperty('--marker-y', String(-Math.cos(radians) * this.hsv.s));
        this.disc.style.setProperty('--wheel-shade', String(1 - this.hsv.v));
        this.swatch.style.setProperty('--swatch-color', rgbToHex(rgb));
        this.brightness.setTrackColor(rgbToHex(hsvToRgb({ ...this.hsv, v: 1 })));
        this.brightness.setValue(this.hsv.v);
        this.channels[0].setValue(rgb.r);
        this.channels[1].setValue(rgb.g);
        this.channels[2].setValue(rgb.b);
        if (updateHex) {
            this.hex.setValue(rgbToHex(rgb));
        }
    }

    /**
     * Hue and saturation of a point of the wheel: hue from the angle (red at
     * the top, clockwise), saturation from the distance to the center.
     */
    private pick(event: PointerEvent): void {
        const rect = this.disc.getBoundingClientRect();
        const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        const hue = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
        // A color picked with brightness at zero would stay black: it is raised to full
        this.apply({ h: hue, s: clamp(Math.hypot(x, y), 0, 1), v: this.hsv.v === 0 ? 1 : this.hsv.v });
    }

    private startDrag(event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        this.pick(event);
        trackPointerDrag(this.disc, event, { move: (moveEvent) => this.pick(moveEvent) });
    }
}
