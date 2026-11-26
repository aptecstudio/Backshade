/**
 * Video outputs of a show: windows on the displays of the computer, each
 * with its own stack of layers (decided by the human). The configuration of
 * the outputs is saved in show.json under "video"; what the layers show
 * (program and preview) belongs to the running session and to the scenes.
 * Shared between engine and interface.
 */

import { MAX_TIMERS, normalizeTimer, type ShowTimer } from './show-timer.js';
import { MAX_GOBOS, normalizeGobo, type TextGobo } from './text-gobo.js';

/** Most outputs, and most layers of an output */
export const MAX_VIDEO_OUTPUTS = 8;
export const MAX_VIDEO_LAYERS = 8;

/** Configuration of a video output */
export interface VideoOutputConfig {
    id: string;
    name: string;
    /** The output window is open */
    enabled: boolean;
    /** Display identifier, empty for the main display */
    display: string;
    /** Covers the whole display; otherwise a window at x, y with width and height */
    fullscreen: boolean;
    /** Position from the top left corner of the display, and size, in pixels */
    x: number;
    y: number;
    width: number;
    height: number;
    /** Order of stacking between the outputs: higher is above */
    stack: number;
    /** Number of layers, the first one at the bottom */
    layers: number;
}

/** Video section of show.json */
export interface ShowVideo {
    outputs: VideoOutputConfig[];
    /** Text gobo presets; missing in older files */
    gobos: TextGobo[];
    /** Timer screen presets; missing in older files */
    timers: ShowTimer[];
}

/** Video of a new show */
export const EMPTY_VIDEO: ShowVideo = { outputs: [], gobos: [], timers: [] };

/** Resolution asked to a video input */
export type InputQuality = '720p' | '1080p' | '2160p';
export const INPUT_QUALITIES: readonly InputQuality[] = ['720p', '1080p', '2160p'];

/** Size of each input quality */
export const QUALITY_SIZES: Readonly<Record<InputQuality, { width: number; height: number }>> = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '2160p': { width: 3840, height: 2160 }
};

/** Frame rates asked to a video input */
export const INPUT_FRAME_RATES: readonly number[] = [25, 30, 50, 60];

/**
 * Source of a layer: a video or an image of the show media, or a video
 * input of the computer (camera, capture card), found again by its name
 * when its identifier changes; the device uses the nearest quality it supports.
 */
export type LayerSource =
    | { kind: 'video'; file: string }
    | { kind: 'image'; file: string }
    | { kind: 'input'; device: string; label: string; quality: InputQuality; frameRate: number }
    | { kind: 'gobo'; gobo: string }
    | { kind: 'timer'; timer: string };

/** Video input of the computer */
export interface VideoInput {
    id: string;
    label: string;
}

/** How a source fills the output */
export type LayerFit = 'fill' | 'fit' | 'stretch';
export const LAYER_FITS: readonly LayerFit[] = ['fill', 'fit', 'stretch'];

/** What a layer shows */
export interface LayerState {
    /** Source, null for an empty layer */
    source: LayerSource | null;
    /** Opacity, 0 to 1 */
    opacity: number;
    fit: LayerFit;
    /** Videos start again at the end */
    loop: boolean;
}

/** Empty layer */
export const EMPTY_LAYER: LayerState = { source: null, opacity: 1, fit: 'fill', loop: true };

/** Program and preview of an output */
export interface OutputComposition {
    program: LayerState[];
    preview: LayerState[];
}

/** Display of the computer */
export interface VideoDisplay {
    id: string;
    label: string;
    width: number;
    height: number;
    primary: boolean;
}

/** Transition of the Take key */
export interface VideoTransition {
    /** Duration in seconds; zero is a cut */
    duration: number;
}

const int = (value: unknown, min: number, max: number, fallback: number): number =>
    Number.isInteger(value) ? Math.min(max, Math.max(min, value as number)) : fallback;

/**
 * Reads a layer; invalid values take the defaults.
 */
export function normalizeLayer(value: unknown): LayerState {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof LayerState, unknown>>;
    return {
        source: normalizeSource(input.source),
        opacity: typeof input.opacity === 'number' && Number.isFinite(input.opacity) ? Math.min(1, Math.max(0, input.opacity)) : 1,
        fit: LAYER_FITS.includes(input.fit as LayerFit) ? input.fit as LayerFit : 'fill',
        loop: input.loop !== false
    };
}

/**
 * Reads the source of a layer; null when it is not valid.
 */
function normalizeSource(value: unknown): LayerSource | null {
    const source = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
    if ((source.kind === 'video' || source.kind === 'image') && typeof source.file === 'string' && source.file !== '') {
        return { kind: source.kind, file: source.file };
    }
    if (source.kind === 'timer' && typeof source.timer === 'string' && source.timer !== '') {
        return { kind: 'timer', timer: source.timer };
    }
    if (source.kind === 'gobo' && typeof source.gobo === 'string' && source.gobo !== '') {
        return { kind: 'gobo', gobo: source.gobo };
    }
    if (source.kind === 'input' && typeof source.device === 'string' && source.device !== '') {
        return {
            kind: 'input',
            device: source.device,
            label: typeof source.label === 'string' ? source.label.slice(0, 200) : '',
            quality: INPUT_QUALITIES.includes(source.quality as InputQuality) ? source.quality as InputQuality : '1080p',
            frameRate: INPUT_FRAME_RATES.includes(source.frameRate as number) ? source.frameRate as number : 30
        };
    }
    return null;
}

/**
 * Reads the layers of an output, completed or cut to its number of layers.
 */
export function normalizeLayers(value: unknown, count: number): LayerState[] {
    const input = Array.isArray(value) ? value : [];
    return Array.from({ length: count }, (_, index) => normalizeLayer(input[index]));
}

/**
 * Reads the video of a file: invalid outputs are dropped, values kept in their limits.
 */
export function normalizeVideo(value: unknown): ShowVideo {
    const input = (typeof value === 'object' && value !== null ? value : {}) as { outputs?: unknown; gobos?: unknown; timers?: unknown };
    const ids = new Set<string>();
    const outputs: VideoOutputConfig[] = [];
    for (const raw of Array.isArray(input.outputs) ? input.outputs.slice(0, MAX_VIDEO_OUTPUTS) : []) {
        const output = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof VideoOutputConfig, unknown>>;
        if (typeof output.id !== 'string' || output.id === '' || ids.has(output.id)) {
            continue;
        }
        ids.add(output.id);
        outputs.push({
            id: output.id,
            name: typeof output.name === 'string' ? output.name.slice(0, 60) : 'Output',
            enabled: output.enabled === true,
            display: typeof output.display === 'string' ? output.display : '',
            fullscreen: output.fullscreen !== false,
            x: int(output.x, 0, 16384, 0),
            y: int(output.y, 0, 16384, 0),
            width: int(output.width, 64, 16384, 1280),
            height: int(output.height, 64, 16384, 720),
            stack: int(output.stack, 0, 99, 0),
            layers: int(output.layers, 1, MAX_VIDEO_LAYERS, 3)
        });
    }
    const gobos: TextGobo[] = [];
    for (const raw of Array.isArray(input.gobos) ? input.gobos.slice(0, MAX_GOBOS) : []) {
        const gobo = normalizeGobo(raw);
        if (gobo !== null && !ids.has(gobo.id)) {
            ids.add(gobo.id);
            gobos.push(gobo);
        }
    }
    const timers: ShowTimer[] = [];
    for (const raw of Array.isArray(input.timers) ? input.timers.slice(0, MAX_TIMERS) : []) {
        const timer = normalizeTimer(raw);
        if (timer !== null && !ids.has(timer.id)) {
            ids.add(timer.id);
            timers.push(timer);
        }
    }
    return { outputs, gobos, timers };
}
