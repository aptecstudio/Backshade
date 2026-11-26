/**
 * Draws a text gobo on a canvas: lines of text with outline and alignment,
 * at its position and rotation, repeated by the prism, out of focus, cut by
 * the shape mask with a soft edge, and animated (scroll, rotation, fade,
 * type-on). The background stays transparent, so the gobo sits over the
 * layers below.
 */

import type { GoboContext, TextGobo } from '../../shared/video/text-gobo.js';
import { goboText } from './gobo-text.js';

/** Image used as mask: alpha from the brightness of the image */
export type MaskSource = HTMLCanvasElement | null;

/**
 * Draws the gobo.
 * @param time - Seconds since the gobo appeared
 * @param shownAt - Time the gobo appeared, in milliseconds (performance clock)
 * @param scratch - Canvas of the same size, reused between frames
 */
export function drawGobo(canvas: HTMLCanvasElement, scratch: HTMLCanvasElement, gobo: TextGobo, context: GoboContext, time: number, shownAt: number, mask: MaskSource): void {
    const width = canvas.width;
    const height = canvas.height;
    const target = canvas.getContext('2d');
    const layer = scratch.getContext('2d');
    if (target === null || layer === null || width === 0 || height === 0) {
        return;
    }
    if (scratch.width !== width || scratch.height !== height) {
        scratch.width = width;
        scratch.height = height;
    }
    layer.clearRect(0, 0, width, height);

    let text = goboText(gobo, context, shownAt);
    const speed = gobo.speed;
    if (gobo.animation === 'typeOn') {
        // Letters appear one after the other, then the text starts again after a pause
        const shown = Math.floor(time * (2 + speed * 28)) % (text.length + 12);
        text = text.slice(0, Math.min(text.length, shown));
    }
    const lines = text.split('\n');
    const size = Math.max(1, gobo.size * height);
    const lineHeight = size * 1.2;
    layer.font = `${gobo.weight === 'bold' ? 700 : 400} ${size}px "${gobo.font.replace(/"/g, '')}", sans-serif`;
    layer.textAlign = gobo.align;
    layer.textBaseline = 'middle';
    layer.lineJoin = 'round';
    const textWidth = Math.max(...lines.map((line) => layer.measureText(line).width), 1);

    // Position, with the scroll moving the text across the whole output
    let cx = gobo.x * width;
    let cy = gobo.y * height;
    if (gobo.animation === 'scroll') {
        const travel = time * (20 + speed * 400);
        if (gobo.direction === 'left' || gobo.direction === 'right') {
            const span = width + textWidth;
            const moved = travel % span;
            cx = gobo.direction === 'left' ? width + textWidth / 2 - moved : -textWidth / 2 + moved;
        } else {
            const span = height + lineHeight * lines.length;
            const moved = travel % span;
            cy = gobo.direction === 'up' ? height + (lineHeight * lines.length) / 2 - moved : -(lineHeight * lines.length) / 2 + moved;
        }
    }
    let rotation = gobo.rotation;
    if (gobo.animation === 'rotate') {
        rotation += time * (10 + speed * 170) * (gobo.direction === 'left' ? -1 : 1);
    }
    const alignShift = gobo.align === 'left' ? -textWidth / 2 : gobo.align === 'right' ? textWidth / 2 : 0;

    const drawText = (dx: number, dy: number): void => {
        layer.save();
        layer.translate(cx + dx, cy + dy);
        layer.rotate((rotation * Math.PI) / 180);
        const top = -((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, index) => {
            const y = top + index * lineHeight;
            if (gobo.outline > 0) {
                layer.strokeStyle = gobo.outlineColor;
                layer.lineWidth = gobo.outline * size * 2;
                layer.strokeText(line, alignShift, y);
            }
            layer.fillStyle = gobo.color;
            layer.fillText(line, alignShift, y);
        });
        layer.restore();
    };
    if (gobo.prism <= 1) {
        drawText(0, 0);
    } else {
        // Copies around the center, as a rotating glass prism in front of a gobo
        const radius = gobo.prismSpread * height * 0.35;
        const spin = gobo.animation === 'rotate' ? (rotation * Math.PI) / 180 : 0;
        for (let facet = 0; facet < gobo.prism; facet++) {
            const angle = spin + (facet * 2 * Math.PI) / gobo.prism;
            drawText(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
    }

    // Shape mask with soft edge
    if (gobo.mask !== 'none') {
        layer.save();
        layer.globalCompositeOperation = 'destination-in';
        const maskSize = gobo.maskSize * height;
        const mx = gobo.x * width;
        const my = gobo.y * height;
        if (gobo.mask === 'circle') {
            const radius = maskSize / 2;
            const gradient = layer.createRadialGradient(mx, my, radius * (1 - gobo.softness), mx, my, Math.max(radius, 1));
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            layer.fillStyle = gradient;
            layer.fillRect(0, 0, width, height);
        } else if (mask !== null) {
            const ratio = mask.width / Math.max(1, mask.height);
            const maskWidth = maskSize * ratio;
            layer.filter = gobo.softness > 0 ? `blur(${gobo.softness * maskSize * 0.05}px)` : 'none';
            layer.drawImage(mask, mx - maskWidth / 2, my - maskSize / 2, maskWidth, maskSize);
        }
        layer.restore();
    }

    target.clearRect(0, 0, width, height);
    target.save();
    target.filter = gobo.focus > 0 ? `blur(${gobo.focus * size * 0.2}px)` : 'none';
    target.globalAlpha = gobo.animation === 'fade' ? (Math.sin(time * (0.5 + speed * 5) * Math.PI) + 1) / 2 : 1;
    target.drawImage(scratch, 0, 0);
    target.restore();
}

/**
 * Turns an image into a mask: bright parts let the gobo through, dark parts hide it.
 */
export function imageToMask(image: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (context === null) {
        return canvas;
    }
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < data.data.length; index += 4) {
        const light = (data.data[index] + data.data[index + 1] + data.data[index + 2]) / 3;
        data.data[index + 3] = (light * data.data[index + 3]) / 255;
    }
    context.putImageData(data, 0, 0);
    return canvas;
}
