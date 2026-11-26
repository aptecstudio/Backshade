/**
 * Basic matrix effects and simple animations: solid color, gradient,
 * scrolling bars, a chasing bar and a pulse between two colors.
 */

import { along, MAX_CYCLES_PER_SECOND, MAX_PIXELS_PER_SECOND, mix, parseColor, setPixel, type EffectDrawer } from './effect-tools';

export const drawSolid: EffectDrawer = (effect, frame) => {
    const color = parseColor(effect.colors[0]);
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            setPixel(frame, x, y, color);
        }
    }
};

export const drawGradient: EffectDrawer = (effect, frame) => {
    const from = parseColor(effect.colors[0]);
    const to = parseColor(effect.colors[1]);
    const radians = (effect.angle * Math.PI) / 180;
    const dx = Math.cos(radians);
    const dy = Math.sin(radians);
    // Extent of the matrix along the angle, so the gradient always spans it
    const extent = Math.abs(dx) * (frame.width - 1) + Math.abs(dy) * (frame.height - 1) || 1;
    const start = Math.min(0, dx * (frame.width - 1)) + Math.min(0, dy * (frame.height - 1));
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            setPixel(frame, x, y, mix(from, to, (x * dx + y * dy - start) / extent));
        }
    }
};

export const drawScroll: EffectDrawer = (effect, frame, time) => {
    const a = parseColor(effect.colors[0]);
    const b = parseColor(effect.colors[1]);
    const offset = time * effect.speed * MAX_PIXELS_PER_SECOND;
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            const { position, length } = along(effect.direction, x, y, frame);
            const band = Math.max(1, Math.round(effect.size * length / 2));
            const index = Math.floor((position - offset) / band);
            setPixel(frame, x, y, ((index % 2) + 2) % 2 === 0 ? a : b);
        }
    }
};

export const drawChase: EffectDrawer = (effect, frame, time) => {
    const bar = parseColor(effect.colors[0]);
    const background = parseColor(effect.colors[1]);
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            const { position, length } = along(effect.direction, x, y, frame);
            const width = Math.max(1, Math.round(effect.size * length / 2));
            const head = (time * effect.speed * MAX_PIXELS_PER_SECOND) % (length + width);
            // Soft tail behind the head of the bar
            const distance = head - position;
            const level = distance >= 0 && distance < width ? 1 - distance / width : 0;
            setPixel(frame, x, y, mix(background, bar, level));
        }
    }
};

export const drawPulse: EffectDrawer = (effect, frame, time) => {
    const a = parseColor(effect.colors[0]);
    const b = parseColor(effect.colors[1]);
    const level = (Math.sin(time * effect.speed * MAX_CYCLES_PER_SECOND * 2 * Math.PI) + 1) / 2;
    const color = mix(b, a, level);
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            setPixel(frame, x, y, color);
        }
    }
};
