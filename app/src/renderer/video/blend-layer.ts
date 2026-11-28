/**
 * Canvas laid over the picture of an output for its edge blending: it fades
 * the zones and lifts the black outside them. It is drawn small and
 * stretched, only when the blending changes.
 */

import { BLEND_EDGES, blendGain, type OutputBlend } from '../../shared/video/blend.js';

/** Size of the drawing: the fades are smooth, they stand being stretched */
const WIDTH = 960;
const HEIGHT = 540;

export class BlendLayer {
    readonly canvas = document.createElement('canvas');

    constructor() {
        this.canvas.classList.add('blend-layer');
        this.canvas.width = WIDTH;
        this.canvas.height = HEIGHT;
    }

    set(blend: OutputBlend): void {
        const context = this.canvas.getContext('2d');
        if (context === null) {
            return;
        }
        const image = context.createImageData(WIDTH, HEIGHT);
        // A zone narrower than the drawing still reaches the outer pixels
        const along = (index: number, size: number): number => index / (size - 1);
        for (let row = 0; row < HEIGHT; row++) {
            const y = along(row, HEIGHT);
            for (let column = 0; column < WIDTH; column++) {
                const x = along(column, WIDTH);
                const gain = blendGain(blend, x, y);
                const inside = BLEND_EDGES.some((name) => ({ left: x, right: 1 - x, top: y, bottom: 1 - y })[name] < blend.edges[name].width);
                const lift = inside ? 0 : blend.black;
                // Over the picture p this gives p * gain * (1 - lift) + lift
                const alpha = 1 - gain * (1 - lift);
                const grey = alpha > 0 ? Math.round((lift / alpha) * 255) : 0;
                const at = (row * WIDTH + column) * 4;
                image.data[at] = grey;
                image.data[at + 1] = grey;
                image.data[at + 2] = grey;
                image.data[at + 3] = Math.round(alpha * 255);
            }
        }
        context.putImageData(image, 0, 0);
    }

    destroy(): void {
        this.canvas.remove();
    }
}
