/**
 * Text gobos: text layers for the video outputs with the look of a light
 * gobo (shape mask with soft edge, focus, rotation, prism), animations and
 * dynamic texts. They are presets of the show (decided by the human), saved
 * in show.json under "video.gobos"; a layer uses a preset as its source, so
 * a change of the preset shows everywhere it is used. Dynamic texts are
 * placeholders in the text (decided by the human). Shared between engine and
 * interface.
 */

/** Weight of the letters */
export type GoboWeight = 'regular' | 'bold';

/** Alignment of the lines */
export type GoboAlign = 'left' | 'center' | 'right';
export const GOBO_ALIGNS: readonly GoboAlign[] = ['left', 'center', 'right'];

/** Shape mask: none, a circle like a gobo, or an image of the show media */
export type GoboMask = 'none' | 'circle' | 'image';
export const GOBO_MASKS: readonly GoboMask[] = ['none', 'circle', 'image'];

/** Animation */
export type GoboAnimation = 'none' | 'scroll' | 'rotate' | 'fade' | 'typeOn';
export const GOBO_ANIMATIONS: readonly GoboAnimation[] = ['none', 'scroll', 'rotate', 'fade', 'typeOn'];

/** Direction of the scroll; left and right also turn the rotation */
export type GoboDirection = 'left' | 'right' | 'up' | 'down';
export const GOBO_DIRECTIONS: readonly GoboDirection[] = ['left', 'right', 'up', 'down'];

/** Countdown: for a duration from when the gobo appears, or to a time of the day */
export type CountdownMode = 'duration' | 'time';

/** Copies of the prism */
export const PRISM_FACETS: readonly number[] = [1, 3, 5, 6, 8];

/** Placeholders of the dynamic texts */
export const GOBO_PLACEHOLDERS: readonly string[] = ['{cue}', '{song}', '{clock}', '{timecode}', '{countdown}'];

/** Most gobos in a show, and longest text */
export const MAX_GOBOS = 100;
export const GOBO_TEXT_MAX_LENGTH = 500;

/** Text gobo */
export interface TextGobo {
    id: string;
    name: string;
    /** Text; several lines with line breaks; placeholders for the dynamic texts */
    text: string;
    font: string;
    weight: GoboWeight;
    /** Height of the letters, as a part of the output height */
    size: number;
    color: string;
    outlineColor: string;
    /** Width of the outline, as a part of the letter height; zero for none */
    outline: number;
    align: GoboAlign;
    /** Center of the gobo, 0 to 1 from the left and from the top */
    x: number;
    y: number;
    mask: GoboMask;
    /** Image of the show media used as mask */
    maskFile: string;
    /** Size of the mask, as a part of the output height */
    maskSize: number;
    /** Soft edge of the mask, 0 (sharp) to 1 */
    softness: number;
    /** Out of focus, 0 (sharp) to 1 */
    focus: number;
    /** Rotation in degrees */
    rotation: number;
    /** Copies of the prism (1 for none) and their distance from the center, 0 to 1 */
    prism: number;
    prismSpread: number;
    animation: GoboAnimation;
    /** Speed of the animation, 0 to 1 */
    speed: number;
    direction: GoboDirection;
    countdownMode: CountdownMode;
    /** Countdown duration in seconds, or time of the day "HH:MM" */
    countdownSeconds: number;
    countdownTime: string;
}

/** Live data for the dynamic texts */
export interface GoboContext {
    /** Current cue (note or scene name), song playing */
    cue: string;
    song: string;
}

/**
 * Gobo with the default values.
 */
export function defaultGobo(id: string, name: string): TextGobo {
    return {
        id,
        name,
        text: 'Backshade',
        font: 'sans-serif',
        weight: 'bold',
        size: 0.15,
        color: '#ffffff',
        outlineColor: '#000000',
        outline: 0,
        align: 'center',
        x: 0.5,
        y: 0.5,
        mask: 'none',
        maskFile: '',
        maskSize: 0.8,
        softness: 0.3,
        focus: 0,
        rotation: 0,
        prism: 1,
        prismSpread: 0.3,
        animation: 'none',
        speed: 0.3,
        direction: 'left',
        countdownMode: 'duration',
        countdownSeconds: 300,
        countdownTime: '21:00'
    };
}

const HEX = /^#[0-9a-f]{6}$/;

/**
 * Reads a gobo; invalid values take the defaults. Null without an identifier.
 */
export function normalizeGobo(value: unknown): TextGobo | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof TextGobo, unknown>>;
    if (typeof input.id !== 'string' || input.id === '') {
        return null;
    }
    const base = defaultGobo(input.id, typeof input.name === 'string' ? input.name.slice(0, 60) : 'Gobo');
    const unit = (field: keyof TextGobo, min = 0, max = 1): number => {
        const raw = input[field];
        return typeof raw === 'number' && Number.isFinite(raw) ? Math.min(max, Math.max(min, raw)) : base[field] as number;
    };
    const color = (field: 'color' | 'outlineColor'): string => {
        const raw = typeof input[field] === 'string' ? (input[field] as string).toLowerCase() : '';
        return HEX.test(raw) ? raw : base[field];
    };
    const choice = <T extends string>(field: keyof TextGobo, values: readonly T[]): T =>
        values.includes(input[field] as T) ? input[field] as T : base[field] as T;
    return {
        ...base,
        text: typeof input.text === 'string' ? input.text.slice(0, GOBO_TEXT_MAX_LENGTH) : base.text,
        font: typeof input.font === 'string' && input.font.length <= 100 ? input.font : base.font,
        weight: choice('weight', ['regular', 'bold'] as const),
        size: unit('size', 0.02, 1),
        color: color('color'),
        outlineColor: color('outlineColor'),
        outline: unit('outline', 0, 0.2),
        align: choice('align', GOBO_ALIGNS),
        x: unit('x'),
        y: unit('y'),
        mask: choice('mask', GOBO_MASKS),
        maskFile: typeof input.maskFile === 'string' ? input.maskFile : '',
        maskSize: unit('maskSize', 0.05, 2),
        softness: unit('softness'),
        focus: unit('focus'),
        rotation: unit('rotation', -180, 180),
        prism: PRISM_FACETS.includes(input.prism as number) ? input.prism as number : 1,
        prismSpread: unit('prismSpread'),
        animation: choice('animation', GOBO_ANIMATIONS),
        speed: unit('speed'),
        direction: choice('direction', GOBO_DIRECTIONS),
        countdownMode: choice('countdownMode', ['duration', 'time'] as const),
        countdownSeconds: unit('countdownSeconds', 0, 24 * 3600),
        countdownTime: typeof input.countdownTime === 'string' && /^\d{1,2}:\d{2}$/.test(input.countdownTime) ? input.countdownTime : base.countdownTime
    };
}
