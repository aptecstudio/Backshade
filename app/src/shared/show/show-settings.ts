/**
 * Show settings, saved in show.json and separate from the
 * global application settings.
 */

/** Timecode frame rate */
export type TimecodeRate = '24' | '25' | '29.97df' | '30';

/** Available frame rates, in presentation order */
export const TIMECODE_RATES: readonly TimecodeRate[] = ['24', '25', '29.97df', '30'];

/** Show settings */
export interface ShowSettings {
    /** Short description: venue, date, type of event */
    description: string;
    /** Free notes: contacts, schedules, technical notes */
    notes: string;
    /** Timecode frame rate, for timeline and synchronization */
    timecodeRate: TimecodeRate;
    /** Default fade in of scenes and cues, in seconds */
    fadeInSeconds: number;
    /** Default fade out of scenes and cues, in seconds */
    fadeOutSeconds: number;
}

/** Limits of the fade times, in seconds */
export const FADE_LIMITS = { min: 0, max: 600 } as const;

/** Default values of a new show */
export const DEFAULT_SHOW_SETTINGS: ShowSettings = {
    description: '',
    notes: '',
    timecodeRate: '25',
    fadeInSeconds: 0,
    fadeOutSeconds: 0
};

/**
 * Completes and corrects settings read from a file: missing or
 * invalid values take the default.
 */
export function normalizeShowSettings(value: unknown): ShowSettings {
    const input = typeof value === 'object' && value !== null ? value as Partial<Record<keyof ShowSettings, unknown>> : {};
    const fade = (seconds: unknown, fallback: number): number =>
        typeof seconds === 'number' && Number.isFinite(seconds)
            ? Math.min(FADE_LIMITS.max, Math.max(FADE_LIMITS.min, seconds))
            : fallback;

    return {
        description: typeof input.description === 'string' ? input.description : DEFAULT_SHOW_SETTINGS.description,
        notes: typeof input.notes === 'string' ? input.notes : DEFAULT_SHOW_SETTINGS.notes,
        timecodeRate: TIMECODE_RATES.includes(input.timecodeRate as TimecodeRate)
            ? input.timecodeRate as TimecodeRate
            : DEFAULT_SHOW_SETTINGS.timecodeRate,
        fadeInSeconds: fade(input.fadeInSeconds, DEFAULT_SHOW_SETTINGS.fadeInSeconds),
        fadeOutSeconds: fade(input.fadeOutSeconds, DEFAULT_SHOW_SETTINGS.fadeOutSeconds)
    };
}
