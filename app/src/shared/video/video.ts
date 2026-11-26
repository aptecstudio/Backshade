/**
 * Video outputs of a show: windows on the displays of the computer, each
 * with its own stack of layers (decided by the human). The configuration of
 * the outputs is saved in show.json under "video"; what the layers show
 * (program and preview) belongs to the running session and to the scenes.
 * Shared between engine and interface.
 */

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
}

/** Video of a new show */
export const EMPTY_VIDEO: ShowVideo = { outputs: [] };

/** Source of a layer: a video or an image of the show media */
export type LayerSource = { kind: 'video'; file: string } | { kind: 'image'; file: string };

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
    const source = (typeof input.source === 'object' && input.source !== null ? input.source : {}) as { kind?: unknown; file?: unknown };
    return {
        source: (source.kind === 'video' || source.kind === 'image') && typeof source.file === 'string' && source.file !== ''
            ? { kind: source.kind, file: source.file }
            : null,
        opacity: typeof input.opacity === 'number' && Number.isFinite(input.opacity) ? Math.min(1, Math.max(0, input.opacity)) : 1,
        fit: LAYER_FITS.includes(input.fit as LayerFit) ? input.fit as LayerFit : 'fill',
        loop: input.loop !== false
    };
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
    const input = (typeof value === 'object' && value !== null ? value : {}) as { outputs?: unknown };
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
    return { outputs };
}
