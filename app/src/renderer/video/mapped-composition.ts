/**
 * A composition shown through its videomapping: without surfaces or test
 * image it is shown as it is; otherwise its pictures are drawn on the
 * surfaces over it. The masks are laid over all, and the edge blending over
 * the masks. A new mapping with a morph time is reached by moving there.
 */

import { blends, type OutputBlend } from '../../shared/video/blend.js';
import { mappingOf, mixMapping, type OutputMapping } from '../../shared/video/mapping-preset.js';
import type { OutputMask } from '../../shared/video/mask.js';
import { BlendLayer } from './blend-layer.js';
import type { CompositionView } from './composition-view.js';
import { MappingRenderer, type MappingScene } from './mapping-renderer.js';
import { MaskLayer } from './mask-layer.js';

export class MappedComposition {
    private renderer: MappingRenderer | null = null;
    private masks: MaskLayer | null = null;
    private blend: BlendLayer | null = null;
    /** Blending drawn now: drawing it again takes time */
    private drawnBlend = '';
    /** Mapping on screen, and the one it goes to */
    private shown: OutputMapping | null = null;
    private target = '';
    private frame = 0;
    private scene = { testPattern: false, name: '' };

    /**
     * @param view - Composition, already in the holder
     * @param holder - Element the mapped picture fills
     */
    constructor(private readonly view: CompositionView, private readonly holder: HTMLElement) {}

    /** @param morph - Seconds to move from the mapping shown to a different one */
    apply(scene: MappingScene & OutputMapping, morph = 0): void {
        this.scene = { testPattern: scene.testPattern, name: scene.name };
        const to = mappingOf(scene);
        const key = JSON.stringify(to);
        if (key === this.target) {
            // A morph going on keeps going
            if (this.frame === 0) {
                this.draw(to);
            }
            return;
        }
        this.target = key;
        this.stopMorph();
        const from = this.shown;
        if (from === null || morph <= 0) {
            this.draw(to);
            return;
        }
        const start = performance.now();
        const step = (): void => {
            const done = Math.min(1, (performance.now() - start) / (morph * 1000));
            // Slow at the start and at the end
            this.draw(mixMapping(from, to, done * done * (3 - 2 * done)));
            this.frame = done < 1 ? requestAnimationFrame(step) : 0;
        };
        step();
    }

    private draw(mapping: OutputMapping): void {
        this.shown = mapping;
        this.applyMasks(mapping.masks);
        this.applyBlend(mapping.blend);
        const mapped = mapping.surfaces.length > 0 || this.scene.testPattern;
        this.view.element.classList.toggle('composition--hidden', mapped);
        if (!mapped) {
            this.unmap();
            return;
        }
        if (this.renderer === null) {
            this.renderer = new MappingRenderer(this.view.element);
            // Under the masks
            this.holder.insertBefore(this.renderer.canvas, this.masks?.canvas ?? this.blend?.canvas ?? null);
            this.renderer.start();
        }
        this.renderer.setScene({ ...this.scene, surfaces: mapping.surfaces });
    }

    private stopMorph(): void {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
    }

    destroy(): void {
        this.stopMorph();
        this.shown = null;
        this.target = '';
        this.unmap();
        this.masks?.destroy();
        this.masks = null;
        this.removeBlend();
    }

    private applyBlend(blend: OutputBlend): void {
        if (!blends(blend)) {
            this.removeBlend();
            return;
        }
        const key = JSON.stringify(blend);
        if (this.blend === null) {
            this.blend = new BlendLayer();
            this.holder.append(this.blend.canvas);
        }
        if (key !== this.drawnBlend) {
            this.drawnBlend = key;
            this.blend.set(blend);
        }
    }

    private removeBlend(): void {
        this.blend?.destroy();
        this.blend = null;
        this.drawnBlend = '';
    }

    private applyMasks(masks: OutputMask[]): void {
        if (masks.some((mask) => mask.enabled)) {
            if (this.masks === null) {
                this.masks = new MaskLayer();
                // Under the blending
                this.holder.insertBefore(this.masks.canvas, this.blend?.canvas ?? null);
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
