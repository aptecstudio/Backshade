/**
 * Canvas laid over the picture of an output for its edge blending: it fades
 * the zones and lifts the black outside them. It is drawn small and
 * stretched, only when the blending changes.
 */

import { blendGain, type BlendEdgeName, type OutputBlend } from '../../shared/video/blend.js';

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
        // The sides facing across fade by column, the others by row
        const axis = (size: number, names: readonly BlendEdgeName[], gainAt: (position: number) => number): Array<{ gain: number; inside: boolean }> =>
            Array.from({ length: size }, (_, index) => {
                // A zone narrower than the drawing still reaches the outer pixels
                const position = index / (size - 1);
                const [low, high] = names;
                return { gain: gainAt(position), inside: position < blend.edges[low].width || 1 - position < blend.edges[high].width };
            });
        const columns = axis(WIDTH, ['left', 'right'], (x) => blendGain(blend, x, 0.5));
        const rows = axis(HEIGHT, ['top', 'bottom'], (y) => blendGain(blend, 0.5, y));
        let at = 0;
        for (const row of rows) {
            for (const column of columns) {
                const lift = row.inside || column.inside ? 0 : blend.black;
                // Over the picture p this gives p * gain * (1 - lift) + lift
                const alpha = 1 - column.gain * row.gain * (1 - lift);
                const grey = alpha > 0 ? Math.round((lift / alpha) * 255) : 0;
                image.data[at] = grey;
                image.data[at + 1] = grey;
                image.data[at + 2] = grey;
                image.data[at + 3] = Math.round(alpha * 255);
                at += 4;
            }
        }
        context.putImageData(image, 0, 0);
    }

    destroy(): void {
        this.canvas.remove();
    }
}
