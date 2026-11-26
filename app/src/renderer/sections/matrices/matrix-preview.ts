/**
 * Live preview of an LED matrix: one square per pixel, in the color it is
 * sent, read from the engine about 15 times per second while it is shown.
 */

import { Component, create } from '../../../framework/ts/index.js';
import type { MatrixEntry } from '../../../shared/transport/engine-api.js';
import { engine } from '../../transport/engine.js';

const REFRESH_MS = 66;
// Largest side of the preview, and room between pixels
const MAX_SIDE = 640;
const MAX_CELL = 32;

export class MatrixPreview extends Component<HTMLCanvasElement> {
    private readonly matrix: MatrixEntry;
    private readonly cell: number;
    private timer: number | null = null;
    private stopped = false;

    constructor(matrix: MatrixEntry) {
        const cell = Math.max(2, Math.min(MAX_CELL, Math.floor(MAX_SIDE / Math.max(matrix.width, matrix.height))));
        super(create('canvas', {
            classes: ['matrix-preview'],
            attributes: { width: String(matrix.width * cell), height: String(matrix.height * cell), role: 'img', 'aria-label': matrix.name }
        }));
        this.matrix = matrix;
        this.cell = cell;
        this.draw(new Array<number>(matrix.width * matrix.height * 3).fill(0));
        this.track(() => {
            this.stopped = true;
            if (this.timer !== null) {
                window.clearTimeout(this.timer);
            }
        });
        void this.poll();
    }

    private async poll(): Promise<void> {
        try {
            this.draw(await engine().request('matrices.getPixels', { id: this.matrix.id }));
        } catch {
            // The matrix was removed or the show closed: the section reloads
        }
        if (!this.stopped) {
            this.timer = window.setTimeout(() => void this.poll(), REFRESH_MS);
        }
    }

    private draw(pixels: readonly number[]): void {
        const context = this.element.getContext('2d');
        if (context === null) {
            return;
        }
        const { width, height } = this.matrix;
        const gap = this.cell >= 6 ? 1 : 0;
        // Background of the display token, set by the styles
        context.fillStyle = getComputedStyle(this.element).backgroundColor;
        context.fillRect(0, 0, this.element.width, this.element.height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const at = (y * width + x) * 3;
                context.fillStyle = `rgb(${pixels[at]}, ${pixels[at + 1]}, ${pixels[at + 2]})`;
                context.fillRect(x * this.cell + gap, y * this.cell + gap, this.cell - gap * 2, this.cell - gap * 2);
            }
        }
    }
}
