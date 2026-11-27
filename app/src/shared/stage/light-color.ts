/**
 * Colors of light: the emitters of additive mixing and the color of a white
 * source from its temperature. Red, green and blue from 0 to 1.
 */

import type { FixtureAttribute } from '../fixtures/fixture-definition.js';

export type Rgb = [number, number, number];

/** Color of the light of each additive emitter */
export const EMITTERS: Readonly<Partial<Record<FixtureAttribute, Rgb>>> = {
    red: [1, 0, 0],
    green: [0, 1, 0],
    blue: [0, 0, 1],
    white: [1, 0.96, 0.92],
    warmWhite: [1, 0.72, 0.42],
    coldWhite: [0.82, 0.9, 1],
    amber: [1, 0.6, 0],
    uv: [0.3, 0, 0.85],
    lime: [0.68, 1, 0.1]
};

const limit = (value: number): number => Math.max(0, Math.min(1, value));

/** Color of a white source at a temperature in kelvin (Tanner Helland approximation) */
export function temperatureColor(kelvin: number): Rgb {
    const t = Math.max(1000, Math.min(20000, kelvin)) / 100;
    const red = t <= 66 ? 255 : 329.7 * (t - 60) ** -0.1332;
    const green = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * (t - 60) ** -0.0755;
    const blue = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
    return [limit(red / 255), limit(green / 255), limit(blue / 255)];
}

export function hueColor(hue: number, saturation: number): Rgb {
    const channel = (offset: number): number => {
        const k = (offset + hue * 6) % 6;
        return 1 - saturation * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return [channel(5), channel(3), channel(1)];
}

/** Color of a "#rrggbb" slot of a color wheel */
export function hexColor(hex: string): Rgb {
    return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255) as Rgb;
}
