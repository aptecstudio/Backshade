/**
 * Draws the text of a text effect with a system font, at the height of
 * the matrix, and keeps only the alpha of each pixel. The engine moves this
 * image across the matrix, so the effect plays without any window open.
 */

import { TEXT_MASK_MAX_WIDTH, type TextMask } from '../../../shared/patch/matrix-effect.js';

/**
 * Text image for a matrix.
 * @param size - Size of the letters, 0 (half the height) to 1 (the full height)
 * @returns null for an empty text
 */
export function renderTextMask(text: string, font: string, size: number, height: number): TextMask | null {
    if (text.trim() === '') {
        return null;
    }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context === null) {
        return null;
    }
    const fontSize = Math.max(4, Math.round(height * (0.5 + size * 0.5)));
    const css = `${fontSize}px "${font.replace(/"/g, '')}", sans-serif`;
    context.font = css;
    const width = Math.min(TEXT_MASK_MAX_WIDTH, Math.max(1, Math.ceil(context.measureText(text).width)));
    canvas.width = width;
    canvas.height = height;
    // Resizing the canvas resets its state
    context.font = css;
    context.textBaseline = 'middle';
    context.fillStyle = 'white';
    context.fillText(text, 0, height / 2);
    const image = context.getImageData(0, 0, width, height).data;
    let binary = '';
    for (let index = 3; index < image.length; index += 4) {
        binary += String.fromCharCode(image[index]);
    }
    return { width, height, data: btoa(binary) };
}
