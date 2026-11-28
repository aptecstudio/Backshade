/**
 * Canvas laid over the picture of an output that blacks out what its masks
 * hide. Inverted masks show only what is inside them, all together; then the
 * others hide what is inside them. It is drawn again only when the masks or
 * the size change.
 */

import { maskPath, type OutputMask } from '../../shared/video/mask.js';

export class MaskLayer {
    readonly canvas = document.createElement('canvas');
    private masks: OutputMask[] = [];
    private readonly observer: ResizeObserver;

    constructor() {
        this.canvas.classList.add('mask-layer');
        this.observer = new ResizeObserver(() => this.draw());
        this.observer.observe(this.canvas);
    }

    setMasks(masks: readonly OutputMask[]): void {
        this.masks = masks.filter((mask) => mask.enabled);
        this.draw();
    }

    destroy(): void {
        this.observer.disconnect();
        this.canvas.remove();
    }

    private draw(): void {
        const width = Math.round(this.canvas.clientWidth * devicePixelRatio);
        const height = Math.round(this.canvas.clientHeight * devicePixelRatio);
        const context = this.canvas.getContext('2d');
        if (context === null || width === 0 || height === 0) {
            return;
        }
        this.canvas.width = width;
        this.canvas.height = height;
        const fill = (mask: OutputMask): void => {
            context.filter = mask.feather > 0 ? `blur(${mask.feather * width / 2}px)` : 'none';
            context.fill(new Path2D(maskPath(mask.points, width, height)));
        };
        context.fillStyle = '#000';
        const shown = this.masks.filter((mask) => mask.inverted);
        if (shown.length > 0) {
            // Black everywhere, with holes where the inverted masks are
            context.fillRect(0, 0, width, height);
            context.globalCompositeOperation = 'destination-out';
            shown.forEach(fill);
            context.globalCompositeOperation = 'source-over';
        }
        this.masks.filter((mask) => !mask.inverted).forEach(fill);
        context.filter = 'none';
    }
}
