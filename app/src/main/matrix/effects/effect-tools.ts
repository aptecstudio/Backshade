/**
 * Tools shared by the matrix effects: the frame being drawn, colors and
 * the coordinate along the direction of movement.
 */

import type { EffectDirection, MatrixEffect } from '../../../shared/patch/matrix-effect';

/** Color, 0 to 255 per component */
export type Color = [number, number, number];

/** What an effect draws on: colors in grid order (rows from the top), three values per pixel */
export interface EffectFrame {
    width: number;
    height: number;
    pixels: Float32Array;
}

/** Draws an effect at a time, in seconds from its start */
export type EffectDrawer = (effect: MatrixEffect, frame: EffectFrame, time: number) => void;

/**
 * Color of a "#rrggbb" text; black when it is not valid.
 */
export function parseColor(hex: string | undefined): Color {
    const value = /^#[0-9a-fA-F]{6}$/.test(hex ?? '') ? parseInt((hex as string).slice(1), 16) : 0;
    return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/**
 * Mix of two colors, amount 0 (first) to 1 (second).
 */
export function mix(a: Color, b: Color, amount: number): Color {
    const t = Math.min(1, Math.max(0, amount));
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Color of a hue (0 to 1) at full saturation and brightness.
 */
export function hue(value: number): Color {
    const h = ((value % 1) + 1) % 1 * 6;
    const x = 1 - Math.abs((h % 2) - 1);
    const table: Color[] = [[1, x, 0], [x, 1, 0], [0, 1, x], [0, x, 1], [x, 0, 1], [1, 0, x]];
    const [r, g, b] = table[Math.floor(h) % 6];
    return [r * 255, g * 255, b * 255];
}

/**
 * Writes the color of a pixel.
 */
export function setPixel(frame: EffectFrame, x: number, y: number, color: Color): void {
    const at = (y * frame.width + x) * 3;
    frame.pixels[at] = color[0];
    frame.pixels[at + 1] = color[1];
    frame.pixels[at + 2] = color[2];
}

/**
 * Coordinate of a pixel along the direction of movement, so that a pattern
 * drawn at "position - offset" travels in that direction as offset grows.
 */
export function along(direction: EffectDirection, x: number, y: number, frame: EffectFrame): { position: number; length: number } {
    switch (direction) {
        case 'right': return { position: x, length: frame.width };
        case 'left': return { position: frame.width - 1 - x, length: frame.width };
        case 'down': return { position: y, length: frame.height };
        case 'up': return { position: frame.height - 1 - y, length: frame.height };
    }
}

/** Movement in pixels per second at full speed */
export const MAX_PIXELS_PER_SECOND = 40;

/** Cycles per second at full speed, for the animations that do not travel */
export const MAX_CYCLES_PER_SECOND = 2;

/**
 * Small repeatable random number, 0 to 1, from integer inputs.
 */
export function noise(a: number, b: number, c: number): number {
    let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
