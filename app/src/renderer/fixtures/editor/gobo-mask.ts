/**
 * Gobo mask of a fixture definition: a small square image in greys, where
 * white is the lit part, kept inside the definition as a PNG data URL.
 */

import { MASK_PREFIX } from '../../../shared/fixtures/fixture-definition.js';

/** Side of a stored mask, in pixels */
export const MASK_SIZE = 128;

/** Picture of a data URL, without loading it as a page resource */
export function maskBitmap(dataUrl: string): Promise<ImageBitmap> {
    const comma = dataUrl.indexOf(',');
    const bytes = Uint8Array.from(atob(dataUrl.slice(comma + 1)), (character) => character.charCodeAt(0));
    return createImageBitmap(new Blob([bytes], { type: dataUrl.slice(5, dataUrl.indexOf(';')) }));
}

/** Makes the mask of an image: fitted in the square, over black, in greys */
export async function makeMask(dataUrl: string): Promise<string> {
    const image = await maskBitmap(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = MASK_SIZE;
    canvas.height = MASK_SIZE;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null) {
        throw new Error('Canvas not available');
    }
    context.fillStyle = '#000';
    context.fillRect(0, 0, MASK_SIZE, MASK_SIZE);
    const scale = MASK_SIZE / Math.max(image.width, image.height);
    const [width, height] = [image.width * scale, image.height * scale];
    context.drawImage(image, (MASK_SIZE - width) / 2, (MASK_SIZE - height) / 2, width, height);
    const pixels = context.getImageData(0, 0, MASK_SIZE, MASK_SIZE);
    for (let index = 0; index < pixels.data.length; index += 4) {
        const grey = Math.round(0.2126 * pixels.data[index] + 0.7152 * pixels.data[index + 1] + 0.0722 * pixels.data[index + 2]);
        pixels.data.fill(grey, index, index + 3);
    }
    context.putImageData(pixels, 0, 0);
    const mask = canvas.toDataURL('image/png');
    if (!mask.startsWith(MASK_PREFIX)) {
        throw new Error('Image not converted');
    }
    return mask;
}
