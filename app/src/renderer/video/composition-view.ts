/**
 * Composition of video layers: one slot per layer, bottom to top, each
 * showing a video or an image of the show media, or a video input of the
 * computer (camera, capture card, without sound), or a text gobo, with its
 * opacity and fit. Gobos are drawn every frame from their preset, so a
 * change of the preset shows at once.
 * A new source fades in over the old one, which fades out; the time of the
 * transition is given with each composition (zero is a cut). Used by the
 * video output windows and by the preview and program of the Video section.
 */

import { Component, create } from '../../framework/ts/index.js';
import { SHOW_MEDIA_ROUTE } from '../../shared/audio/playback-protocol.js';
import { IDLE_TIMER, type ShowTimer, type TimerState } from '../../shared/video/show-timer.js';
import type { GoboContext, TextGobo } from '../../shared/video/text-gobo.js';
import { QUALITY_SIZES, type LayerSource, type LayerState } from '../../shared/video/video.js';
import { drawGobo, imageToMask } from './gobo-renderer.js';
import { drawTimer } from './timer-renderer.js';

interface Slot {
    holder: HTMLDivElement;
    element: HTMLElement | null;
    source: string;
}

function sourceKey(source: LayerSource | null): string {
    if (source === null) {
        return '';
    }
    switch (source.kind) {
        case 'input': return `input:${source.device}:${source.quality}:${source.frameRate}`;
        case 'gobo': return `gobo:${source.gobo}`;
        case 'timer': return `timer:${source.timer}`;
        default: return `${source.kind}:${source.file}`;
    }
}

/**
 * Stream of a video input; when its identifier is unknown, the input with the same name.
 */
async function openInput(source: Extract<LayerSource, { kind: 'input' }>): Promise<MediaStream> {
    const size = QUALITY_SIZES[source.quality];
    const constraints = (device: string): MediaStreamConstraints => ({
        audio: false,
        video: { deviceId: { exact: device }, width: { ideal: size.width }, height: { ideal: size.height }, frameRate: { ideal: source.frameRate } }
    });
    try {
        return await navigator.mediaDevices.getUserMedia(constraints(source.device));
    } catch (error) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const same = devices.find((device) => device.kind === 'videoinput' && device.label === source.label && source.label !== '');
        if (same === undefined) {
            throw error;
        }
        return navigator.mediaDevices.getUserMedia(constraints(same.deviceId));
    }
}

function mediaUrl(file: string): string {
    return SHOW_MEDIA_ROUTE + file.split('/').map(encodeURIComponent).join('/');
}

export class CompositionView extends Component<HTMLDivElement> {
    private slots: Slot[] = [];
    private gobos = new Map<string, TextGobo>();
    private context: GoboContext = { cue: '', song: '' };
    private readonly masks = new Map<string, HTMLCanvasElement | null>();
    private timers = new Map<string, ShowTimer>();
    private timerStates: Record<string, TimerState> = {};

    constructor(classes: string[] = []) {
        super(create('div', { classes: ['composition', ...classes] }));
        this.track(() => this.slots.forEach((slot) => this.release(slot.element)));
    }

    /**
     * Gobo presets and live data of the dynamic texts.
     */
    setGobos(gobos: readonly TextGobo[], context: GoboContext): void {
        this.gobos = new Map(gobos.map((gobo) => [gobo.id, gobo]));
        this.context = context;
    }

    /**
     * Timer presets and their live states.
     */
    setTimers(timers: readonly ShowTimer[], states: Record<string, TimerState>): void {
        this.timers = new Map(timers.map((timer) => [timer.id, timer]));
        this.timerStates = states;
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
        const source = layer.source;
        const element = source.kind === 'input' ? this.input(source)
            : source.kind === 'gobo' ? this.gobo(source.gobo)
                : source.kind === 'timer' ? this.timer(source.timer)
                : source.kind === 'video' ? this.video(layer)
                    : create('img', { attributes: { src: mediaUrl(source.file), alt: '' } });
        element.classList.add('composition__media');
        element.dataset.fit = layer.fit;
        element.style.setProperty('--layer-transition', duration);
        element.style.setProperty('--layer-opacity', '0');
        slot.holder.append(element);
        slot.element = element;
        // Next frame: the opacity change starts the transition
        requestAnimationFrame(() => requestAnimationFrame(() => element.style.setProperty('--layer-opacity', String(layer.opacity))));
    }

    private input(source: Extract<LayerSource, { kind: 'input' }>): HTMLVideoElement {
        const video = create('video');
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        void openInput(source).then((stream) => {
            // The layer may have changed while the device was opening
            if (!video.isConnected) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            video.srcObject = stream;
            void video.play().catch(() => undefined);
        }).catch(() => video.classList.add('composition__media--missing'));
        return video;
    }

    /**
     * Canvas drawn every frame at the size of the composition, until it leaves the page.
     */
    private animatedCanvas(draw: (canvas: HTMLCanvasElement) => void): HTMLCanvasElement {
        const canvas = create('canvas', { classes: ['composition__gobo'] });
        let started = false;
        const frame = (): void => {
            if (!canvas.isConnected && started) {
                return;
            }
            started = true;
            const width = Math.round(this.element.clientWidth * devicePixelRatio);
            const height = Math.round(this.element.clientHeight * devicePixelRatio);
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            draw(canvas);
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        return canvas;
    }

    /** Canvas of a text gobo */
    private gobo(id: string): HTMLCanvasElement {
        const scratch = document.createElement('canvas');
        const shownAt = performance.now();
        return this.animatedCanvas((canvas) => {
            const gobo = this.gobos.get(id);
            if (gobo !== undefined) {
                drawGobo(canvas, scratch, gobo, this.context, (performance.now() - shownAt) / 1000, shownAt, gobo.mask === 'image' ? this.mask(gobo.maskFile) : null);
            }
        });
    }

    /** Canvas of a timer screen */
    private timer(id: string): HTMLCanvasElement {
        return this.animatedCanvas((canvas) => {
            const timer = this.timers.get(id);
            if (timer !== undefined) {
                drawTimer(canvas, timer, this.timerStates[id] ?? IDLE_TIMER, Date.now(), document.documentElement.lang || 'en');
            }
        });
    }

    /** Mask image of the show media, loaded once */
    private mask(file: string): HTMLCanvasElement | null {
        if (file === '') {
            return null;
        }
        if (!this.masks.has(file)) {
            this.masks.set(file, null);
            const image = new Image();
            image.onload = () => this.masks.set(file, imageToMask(image));
            image.src = mediaUrl(file);
        }
        return this.masks.get(file) ?? null;
    }

    private video(layer: LayerState): HTMLVideoElement {
        const video = create('video', { attributes: { src: mediaUrl((layer.source as { file: string }).file) } });
        video.muted = true;
        video.loop = layer.loop;
        video.autoplay = true;
        video.playsInline = true;
        void video.play().catch(() => undefined);
        return video;
    }

    private release(element: HTMLElement | null): void {
        if (element instanceof HTMLVideoElement) {
            if (element.srcObject instanceof MediaStream) {
                element.srcObject.getTracks().forEach((track) => track.stop());
                element.srcObject = null;
            }
            element.pause();
            element.removeAttribute('src');
            element.load();
        }
        element?.remove();
    }
}
