/**
 * Preset animations of the matrices, with colors chosen by the operator:
 * rainbow, wave, sparkle, fire and plasma.
 */

import { along, hue, MAX_CYCLES_PER_SECOND, MAX_PIXELS_PER_SECOND, mix, noise, parseColor, setPixel, type EffectDrawer } from './effect-tools';

export const drawRainbow: EffectDrawer = (effect, frame, time) => {
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            const { position, length } = along(effect.direction, x, y, frame);
            // Size: how many rainbows fit in the matrix, from one to four
            const repeats = 1 + effect.size * 3;
            setPixel(frame, x, y, hue((position / length) * repeats - time * effect.speed * MAX_CYCLES_PER_SECOND / 2));
        }
    }
};

export const drawWave: EffectDrawer = (effect, frame, time) => {
    const a = parseColor(effect.colors[0]);
    const b = parseColor(effect.colors[1]);
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            const { position, length } = along(effect.direction, x, y, frame);
            const wavelength = Math.max(2, length * (0.2 + effect.size));
            const phase = (position - time * effect.speed * MAX_PIXELS_PER_SECOND) / wavelength;
            setPixel(frame, x, y, mix(a, b, (Math.sin(phase * 2 * Math.PI) + 1) / 2));
        }
    }
};

export const drawSparkle: EffectDrawer = (effect, frame, time) => {
    const spark = parseColor(effect.colors[0]);
    const background = parseColor(effect.colors[1]);
    // Every pixel may light up in each time slot, then fades within the slot
    const rate = 2 + effect.speed * 18;
    const slot = Math.floor(time * rate);
    const fade = 1 - (time * rate - slot);
    const density = 0.02 + effect.size * 0.3;
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            const lit = noise(x, y, slot) < density;
            setPixel(frame, x, y, lit ? mix(background, spark, fade) : background);
        }
    }
};

export const drawFire: EffectDrawer = (effect, frame, time) => {
    const ember = parseColor(effect.colors[0]);
    const flame = parseColor(effect.colors[1]);
    const rise = time * (0.5 + effect.speed * 6);
    for (let y = 0; y < frame.height; y++) {
        // Hotter at the bottom of the matrix
        const base = (y + 1) / frame.height;
        for (let x = 0; x < frame.width; x++) {
            const row = y + Math.floor(rise * frame.height / 4);
            const flicker = (noise(x, row, 7) + noise(x + 1, row, 7) + noise(x, row + 1, 7)) / 3;
            const heat = Math.max(0, Math.min(1, base * 1.4 - 0.3 + (flicker - 0.5) * 0.8));
            const color = heat < 0.5 ? mix([0, 0, 0], ember, heat * 2) : mix(ember, flame, (heat - 0.5) * 2);
            setPixel(frame, x, y, color);
        }
    }
};

export const drawPlasma: EffectDrawer = (effect, frame, time) => {
    const colors = [parseColor(effect.colors[0]), parseColor(effect.colors[1]), parseColor(effect.colors[2])];
    const t = time * effect.speed * MAX_CYCLES_PER_SECOND;
    const scale = (0.1 + effect.size * 0.5) * 16 / Math.max(frame.width, frame.height);
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            const value = (Math.sin(x * scale + t) + Math.sin(y * scale * 1.3 - t * 1.1) + Math.sin((x + y) * scale * 0.7 + t * 0.7)) / 6 + 0.5;
            // Three colors around a loop: first to second to third and back
            const position = value * 3;
            const index = Math.floor(position) % 3;
            setPixel(frame, x, y, mix(colors[index], colors[(index + 1) % 3], position - Math.floor(position)));
        }
    }
};
