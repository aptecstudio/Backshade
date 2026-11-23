/**
 * Color conversions between RGB (0 to 255 per channel), HSV and hex text.
 */

import { clamp } from '../core/clamp.js';

/** RGB color, each channel from 0 to 255 */
export interface Rgb {
    r: number;
    g: number;
    b: number;
}

/** HSV color: hue in degrees (0 to 360), saturation and value from 0 to 1 */
export interface Hsv {
    h: number;
    s: number;
    v: number;
}

/**
 * Converts RGB to HSV.
 */
export function rgbToHsv({ r, g, b }: Rgb): Hsv {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;

    let hue = 0;
    if (delta > 0) {
        if (max === red) {
            hue = 60 * (((green - blue) / delta) % 6);
        } else if (max === green) {
            hue = 60 * ((blue - red) / delta + 2);
        } else {
            hue = 60 * ((red - green) / delta + 4);
        }
    }
    return { h: (hue + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

/**
 * Converts HSV to RGB, with whole channel values.
 */
export function hsvToRgb({ h, s, v }: Hsv): Rgb {
    const chroma = v * s;
    const sector = ((h % 360) + 360) % 360 / 60;
    const second = chroma * (1 - Math.abs((sector % 2) - 1));
    const [red, green, blue] = sector < 1 ? [chroma, second, 0]
        : sector < 2 ? [second, chroma, 0]
            : sector < 3 ? [0, chroma, second]
                : sector < 4 ? [0, second, chroma]
                    : sector < 5 ? [second, 0, chroma]
                        : [chroma, 0, second];
    const offset = v - chroma;
    return {
        r: Math.round((red + offset) * 255),
        g: Math.round((green + offset) * 255),
        b: Math.round((blue + offset) * 255)
    };
}

/**
 * Returns the hex text of a color, for example "#ff8800".
 */
export function rgbToHex({ r, g, b }: Rgb): string {
    return `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Reads a hex color with or without "#", in the short ("f80") or long ("ff8800") form.
 * Returns null if the text is not a valid color.
 */
export function hexToRgb(text: string): Rgb | null {
    const hex = text.trim().replace(/^#/, '');
    const full = hex.length === 3 ? hex.split('').map((digit) => digit + digit).join('') : hex;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) {
        return null;
    }
    return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16)
    };
}
