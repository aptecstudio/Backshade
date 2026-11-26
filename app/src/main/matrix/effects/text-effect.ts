/**
 * Text effect: the text image drawn by the interface with a system font
 * (an alpha value per pixel) moves across the matrix in the chosen
 * direction, in the text color over the background color. Still when the
 * speed is zero. An image of another height is scaled to the matrix.
 */

import type { TextMask } from '../../../shared/patch/matrix-effect';
import { MAX_PIXELS_PER_SECOND, mix, parseColor, setPixel, type EffectDrawer } from './effect-tools';

// Decoded images, kept while their effect is in use
const decoded = new WeakMap<TextMask, Uint8Array>();

function alphaOf(mask: TextMask): Uint8Array {
    let data = decoded.get(mask);
    if (data === undefined) {
        data = new Uint8Array(Buffer.from(mask.data, 'base64'));
        decoded.set(mask, data);
    }
    return data;
}

export const drawText: EffectDrawer = (effect, frame, time) => {
    const ink = parseColor(effect.colors[0]);
    const background = parseColor(effect.colors[1]);
    const mask = effect.mask;
    const alpha = mask === null ? null : alphaOf(mask);
    const horizontal = effect.direction === 'left' || effect.direction === 'right';
    const scale = mask === null ? 1 : mask.height / frame.height;
    // The text enters from one side and leaves from the other, then starts again
    const textLength = mask === null ? 0 : horizontal ? mask.width / scale : frame.height;
    const span = (horizontal ? frame.width : frame.height) + textLength;
    const moved = effect.speed === 0 ? (horizontal ? (frame.width - textLength) / 2 : 0) : (time * effect.speed * MAX_PIXELS_PER_SECOND) % span;
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            let level = 0;
            if (mask !== null && alpha !== null) {
                let u = x;
                let v = y;
                if (effect.speed > 0) {
                    switch (effect.direction) {
                        case 'left': u = x - (frame.width - moved); break;
                        case 'right': u = x - (moved - textLength); break;
                        case 'up': v = y - (frame.height - moved); break;
                        case 'down': v = y - (moved - frame.height); break;
                    }
                } else {
                    u = x - moved;
                }
                const sx = Math.floor(u * scale);
                const sy = Math.floor(v * scale);
                if (sx >= 0 && sx < mask.width && sy >= 0 && sy < mask.height) {
                    level = alpha[sy * mask.width + sx] / 255;
                }
            }
            setPixel(frame, x, y, mix(background, ink, level));
        }
    }
};
