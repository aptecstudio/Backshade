/**
 * Composition of video layers: one slot per layer, bottom to top, each
 * showing a video or an image of the show media with its opacity and fit.
 * A new source fades in over the old one, which fades out; the time of the
 * transition is given with each composition (zero is a cut). Used by the
 * video output windows and by the preview and program of the Video section.
 */

import { Component, create } from '../../framework/ts/index.js';
import { SHOW_MEDIA_ROUTE } from '../../shared/audio/playback-protocol.js';
import type { LayerSource, LayerState } from '../../shared/video/video.js';

interface Slot {
    holder: HTMLDivElement;
    element: HTMLElement | null;
    source: string;
}

function sourceKey(source: LayerSource | null): string {
    return source === null ? '' : `${source.kind}:${source.file}`;
}

function mediaUrl(file: string): string {
    return SHOW_MEDIA_ROUTE + file.split('/').map(encodeURIComponent).join('/');
}

export class CompositionView extends Component<HTMLDivElement> {
    private slots: Slot[] = [];

    constructor(classes: string[] = []) {
        super(create('div', { classes: ['composition', ...classes] }));
        this.track(() => this.slots.forEach((slot) => this.release(slot.element)));
    }

    /**
     * Shows layers, with a transition in seconds.
     */
    show(layers: readonly LayerState[], transition: number): void {
        while (this.slots.length < layers.length) {
            const holder = create('div', { classes: ['composition__layer'] });
            this.element.append(holder);
            this.slots.push({ holder, element: null, source: '' });
        }
        while (this.slots.length > layers.length) {
            const slot = this.slots.pop() as Slot;
            this.release(slot.element);
            slot.holder.remove();
        }
        layers.forEach((layer, index) => this.showLayer(this.slots[index], layer, transition));
    }

    private showLayer(slot: Slot, layer: LayerState, transition: number): void {
        const key = sourceKey(layer.source);
        const duration = `${Math.max(0, transition)}s`;
        if (key === slot.source) {
            if (slot.element !== null) {
                slot.element.style.setProperty('--layer-transition', duration);
                slot.element.style.setProperty('--layer-opacity', String(layer.opacity));
                slot.element.dataset.fit = layer.fit;
                if (slot.element instanceof HTMLVideoElement) {
                    slot.element.loop = layer.loop;
                }
            }
            return;
        }
        // The old source fades out and is removed, the new one fades in over it
        const old = slot.element;
        if (old !== null) {
            old.style.setProperty('--layer-transition', duration);
            old.style.setProperty('--layer-opacity', '0');
            window.setTimeout(() => this.release(old), Math.max(0, transition) * 1000 + 100);
        }
        slot.source = key;
        slot.element = null;
        if (layer.source === null) {
            return;
        }
        const element = layer.source.kind === 'video' ? this.video(layer) : create('img', { attributes: { src: mediaUrl(layer.source.file), alt: '' } });
        element.classList.add('composition__media');
        element.dataset.fit = layer.fit;
        element.style.setProperty('--layer-transition', duration);
        element.style.setProperty('--layer-opacity', '0');
        slot.holder.append(element);
        slot.element = element;
        // Next frame: the opacity change starts the transition
        requestAnimationFrame(() => requestAnimationFrame(() => element.style.setProperty('--layer-opacity', String(layer.opacity))));
    }

    private video(layer: LayerState): HTMLVideoElement {
        const video = create('video', { attributes: { src: mediaUrl((layer.source as LayerSource).file) } });
        video.muted = true;
        video.loop = layer.loop;
        video.autoplay = true;
        video.playsInline = true;
        void video.play().catch(() => undefined);
        return video;
    }

    private release(element: HTMLElement | null): void {
        if (element instanceof HTMLVideoElement) {
            element.pause();
            element.removeAttribute('src');
            element.load();
        }
        element?.remove();
    }
}
