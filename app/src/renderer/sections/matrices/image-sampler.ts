/**
 * Samples an image of the show media at the size of a matrix, with the
 * chosen fit, and keeps three color values per pixel. The engine stores
 * these pixels in the effect, so it plays without any window open.
 */

import type { ImageFit, PixelImage } from '../../../shared/patch/matrix-effect.js';
import { engine } from '../../transport/engine.js';

/**
 * Pixels of an image for a matrix.
 * @param file - Path of the image in the show media
 */
export async function sampleImage(file: string, fit: ImageFit, width: number, height: number): Promise<PixelImage> {
    const base64 = await engine().request('media.readImage', { file });
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes]));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (context === null) {
        throw new Error('Canvas not available');
    }
    context.imageSmoothingQuality = 'high';
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);
    if (fit === 'stretch') {
        context.drawImage(bitmap, 0, 0, width, height);
    } else {
        // Fill covers the whole matrix and crops, fit shows the whole image with bars
        const scale = fit === 'fill'
            ? Math.max(width / bitmap.width, height / bitmap.height)
            : Math.min(width / bitmap.width, height / bitmap.height);
        const drawWidth = bitmap.width * scale;
        const drawHeight = bitmap.height * scale;
        context.drawImage(bitmap, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    }
    bitmap.close();
    const rgba = context.getImageData(0, 0, width, height).data;
    let binary = '';
    for (let index = 0; index < rgba.length; index += 4) {
        binary += String.fromCharCode(rgba[index], rgba[index + 1], rgba[index + 2]);
    }
    return { width, height, data: btoa(binary) };
}
