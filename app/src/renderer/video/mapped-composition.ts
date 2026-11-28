/**
 * A composition shown through its videomapping: without surfaces or test
 * image it is shown as it is; otherwise its pictures are drawn on the
 * surfaces over it. The masks are laid over all.
 */

import type { OutputMask } from '../../shared/video/mask.js';
import type { CompositionView } from './composition-view.js';
import { MappingRenderer, type MappingScene } from './mapping-renderer.js';
import { MaskLayer } from './mask-layer.js';

export class MappedComposition {
    private renderer: MappingRenderer | null = null;
    private masks: MaskLayer | null = null;

    /**
     * @param view - Composition, already in the holder
     * @param holder - Element the mapped picture fills
     */
    constructor(private readonly view: CompositionView, private readonly holder: HTMLElement) {}

    apply(scene: MappingScene & { masks: OutputMask[] }): void {
        this.applyMasks(scene.masks);
        const mapped = scene.surfaces.length > 0 || scene.testPattern;
        this.view.element.classList.toggle('composition--hidden', mapped);
        if (!mapped) {
            this.unmap();
            return;
        }
        if (this.renderer === null) {
            this.renderer = new MappingRenderer(this.view.element);
            // Under the masks
            this.holder.insertBefore(this.renderer.canvas, this.masks?.canvas ?? null);
            this.renderer.start();
        }
        this.renderer.setScene(scene);
    }

    destroy(): void {
        this.unmap();
        this.masks?.destroy();
        this.masks = null;
    }

    private applyMasks(masks: OutputMask[]): void {
        if (masks.some((mask) => mask.enabled)) {
            if (this.masks === null) {
                this.masks = new MaskLayer();
                this.holder.append(this.masks.canvas);
            }
            this.masks.setMasks(masks);
        } else {
            this.masks?.destroy();
            this.masks = null;
        }
    }

    private unmap(): void {
        this.renderer?.stop();
        this.renderer?.canvas.remove();
        this.renderer = null;
        this.view.element.classList.remove('composition--hidden');
    }
}
