/**
 * Effects of the LED matrices: what a matrix shows, set live in the
 * Matrices section, recorded in scenes and played by the engine frame by
 * frame. Basic effects (solid color, gradient, scroll, text) and preset
 * animations whose colors can be chosen. Every effect uses the same flat
 * set of parameters; each kind reads only the ones it needs (see
 * EFFECT_SPECS). Shared between engine and interface.
 */

/** Kind of effect */
export type MatrixEffectKind =
    | 'solid' | 'gradient' | 'scroll' | 'text'
    | 'rainbow' | 'wave' | 'sparkle' | 'fire' | 'pulse' | 'plasma' | 'chase';

/** Basic effects, in presentation order */
export const BASIC_EFFECTS: readonly MatrixEffectKind[] = ['solid', 'gradient', 'scroll', 'text'];

/** Preset animations, in presentation order */
export const ANIMATION_EFFECTS: readonly MatrixEffectKind[] = ['rainbow', 'wave', 'sparkle', 'fire', 'pulse', 'plasma', 'chase'];

/** Direction of movement */
export type EffectDirection = 'left' | 'right' | 'up' | 'down';

/** Directions in presentation order */
export const EFFECT_DIRECTIONS: readonly EffectDirection[] = ['left', 'right', 'up', 'down'];

/**
 * Text drawn by the interface with a system font, at the height of the
 * matrix: one alpha value (0 to 255) per pixel, rows from the top, as base64.
 */
export interface TextMask {
    width: number;
    height: number;
    data: string;
}

/** Longest text of a text effect, and widest text image */
export const EFFECT_TEXT_MAX_LENGTH = 200;
export const TEXT_MASK_MAX_WIDTH = 8192;

/** Effect of a matrix */
export interface MatrixEffect {
    kind: MatrixEffectKind;
    /** Colors "#rrggbb"; how many depends on the kind */
    colors: string[];
    /** Speed, 0 (still) to 1 */
    speed: number;
    direction: EffectDirection;
    /** Angle of the gradient, in degrees */
    angle: number;
    /** Size: width of bars, density of sparkles, size of the text; 0 to 1 */
    size: number;
    /** Text effect: text, font family and drawn text */
    text: string;
    font: string;
    mask: TextMask | null;
}

/** Parameters used by a kind of effect */
export interface EffectSpec {
    /** Number of colors, with the default ones */
    colors: string[];
    speed: boolean;
    direction: boolean;
    angle: boolean;
    size: boolean;
    text: boolean;
}

const spec = (colors: string[], speed: boolean, direction: boolean, size: boolean, angle = false, text = false): EffectSpec =>
    ({ colors, speed, direction, angle, size, text });

/** Parameters of every kind of effect */
export const EFFECT_SPECS: Readonly<Record<MatrixEffectKind, EffectSpec>> = {
    solid: spec(['#e8b420'], false, false, false),
    gradient: spec(['#e8b420', '#3a5bd9'], false, false, false, true),
    scroll: spec(['#e8b420', '#000000'], true, true, true),
    text: spec(['#ffffff', '#000000'], true, true, true, false, true),
    rainbow: spec([], true, true, true),
    wave: spec(['#3a5bd9', '#39c6e6'], true, true, true),
    sparkle: spec(['#ffffff', '#000000'], true, false, true),
    fire: spec(['#d8383a', '#e8b420'], true, false, false),
    pulse: spec(['#d8383a', '#000000'], true, false, false),
    plasma: spec(['#9b4dd6', '#39c6e6', '#e8b420'], true, false, true),
    chase: spec(['#ffffff', '#000000'], true, true, true)
};

/** Font families offered for the text effect; the system falls back when one is missing */
export const EFFECT_FONTS: readonly string[] = ['sans-serif', 'serif', 'monospace', 'Arial', 'Verdana', 'Georgia', 'Impact', 'Courier New'];

/**
 * Effect with the default parameters of a kind.
 */
export function defaultEffect(kind: MatrixEffectKind): MatrixEffect {
    return {
        kind,
        colors: [...EFFECT_SPECS[kind].colors],
        speed: 0.4,
        direction: 'left',
        angle: 0,
        size: 0.5,
        text: kind === 'text' ? 'Backshade' : '',
        font: 'sans-serif',
        mask: null
    };
}

const HEX = /^#[0-9a-f]{6}$/;

function unit(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function readMask(value: unknown): TextMask | null {
    const mask = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof TextMask, unknown>>;
    const valid = Number.isInteger(mask.width) && (mask.width as number) >= 1 && (mask.width as number) <= TEXT_MASK_MAX_WIDTH
        && Number.isInteger(mask.height) && (mask.height as number) >= 1 && (mask.height as number) <= 512
        && typeof mask.data === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(mask.data);
    return valid ? { width: mask.width as number, height: mask.height as number, data: mask.data as string } : null;
}

/**
 * Reads an effect from a file or a request; null when the kind is unknown.
 * Missing or invalid parameters take the defaults of the kind.
 */
export function normalizeMatrixEffect(value: unknown): MatrixEffect | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof MatrixEffect, unknown>>;
    const kind = input.kind as MatrixEffectKind;
    if (!(kind in EFFECT_SPECS)) {
        return null;
    }
    const base = defaultEffect(kind);
    const colors = Array.isArray(input.colors) ? input.colors : [];
    return {
        kind,
        colors: base.colors.map((fallback, index) => {
            const color = typeof colors[index] === 'string' ? (colors[index] as string).toLowerCase() : '';
            return HEX.test(color) ? color : fallback;
        }),
        speed: unit(input.speed, base.speed),
        direction: (['left', 'right', 'up', 'down'] as const).includes(input.direction as EffectDirection) ? input.direction as EffectDirection : base.direction,
        angle: typeof input.angle === 'number' && Number.isFinite(input.angle) ? ((input.angle % 360) + 360) % 360 : 0,
        size: unit(input.size, base.size),
        text: typeof input.text === 'string' ? input.text.slice(0, EFFECT_TEXT_MAX_LENGTH) : base.text,
        font: typeof input.font === 'string' && input.font.length <= 100 ? input.font : base.font,
        mask: kind === 'text' ? readMask(input.mask) : null
    };
}

/**
 * Reads the effects of a scene: matrix identifier -> effect.
 */
export function normalizeMatrixEffects(value: unknown): Record<string, MatrixEffect> {
    const result: Record<string, MatrixEffect> = {};
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return result;
    }
    for (const [id, item] of Object.entries(value)) {
        const effect = normalizeMatrixEffect(item);
        if (effect !== null && id !== '') {
            result[id] = effect;
        }
    }
    return result;
}
