/**
 * Image effect: the image of the show media, sampled by the interface at
 * the size of the matrix, shown still or moving in the chosen direction and
 * repeating. An image of another size is scaled to the matrix.
 */

import type { PixelImage } from '../../../shared/patch/matrix-effect';
import { MAX_PIXELS_PER_SECOND, setPixel, type EffectDrawer } from './effect-tools';

// Decoded images, kept while their effect is in use
const decoded = new WeakMap<PixelImage, Uint8Array>();

function pixelsOf(image: PixelImage): Uint8Array {
    let data = decoded.get(image);
    if (data === undefined) {
        data = new Uint8Array(Buffer.from(image.data, 'base64'));
        decoded.set(image, data);
    }
    return data;
}

export const drawImage: EffectDrawer = (effect, frame, time) => {
    const image = effect.image;
    if (image === null) {
        return;
    }
    const data = pixelsOf(image);
    const offset = Math.floor(time * effect.speed * MAX_PIXELS_PER_SECOND);
    const shiftX = effect.direction === 'right' ? -offset : effect.direction === 'left' ? offset : 0;
    const shiftY = effect.direction === 'down' ? -offset : effect.direction === 'up' ? offset : 0;
    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            // Position in the matrix, moved and repeated, then scaled to the image
            const mx = (((x + shiftX) % frame.width) + frame.width) % frame.width;
            const my = (((y + shiftY) % frame.height) + frame.height) % frame.height;
            const sx = Math.min(image.width - 1, Math.floor(mx * image.width / frame.width));
            const sy = Math.min(image.height - 1, Math.floor(my * image.height / frame.height));
            const at = (sy * image.width + sx) * 3;
            setPixel(frame, x, y, [data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0]);
        }
    }
};
