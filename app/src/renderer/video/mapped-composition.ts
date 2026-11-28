/**
 * A composition shown through its videomapping: without surfaces or test
 * image it is shown as it is; otherwise its pictures are drawn on the
 * surfaces over it.
 */

import type { CompositionView } from './composition-view.js';
import { MappingRenderer, type MappingScene } from './mapping-renderer.js';

export class MappedComposition {
    private renderer: MappingRenderer | null = null;

    /**
     * @param view - Composition, already in the holder
     * @param holder - Element the mapped picture fills
     */
    constructor(private readonly view: CompositionView, private readonly holder: HTMLElement) {}

    apply(scene: MappingScene): void {
        const mapped = scene.surfaces.length > 0 || scene.testPattern;
        this.view.element.classList.toggle('composition--hidden', mapped);
        if (!mapped) {
            this.destroy();
            return;
        }
        if (this.renderer === null) {
            this.renderer = new MappingRenderer(this.view.element);
            this.holder.append(this.renderer.canvas);
            this.renderer.start();
        }
        this.renderer.setScene(scene);
    }

    destroy(): void {
        this.renderer?.stop();
        this.renderer?.canvas.remove();
        this.renderer = null;
        this.view.element.classList.remove('composition--hidden');
    }
}
