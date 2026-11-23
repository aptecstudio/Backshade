/**
 * Impostazioni dello show, salvate in show.json e separate dalle
 * impostazioni globali dell'applicazione.
 */

/** Frame rate del timecode */
export type TimecodeRate = '24' | '25' | '29.97df' | '30';

/** Frame rate disponibili, nell'ordine di presentazione */
export const TIMECODE_RATES: readonly TimecodeRate[] = ['24', '25', '29.97df', '30'];

/** Impostazioni dello show */
export interface ShowSettings {
    /** Descrizione breve: luogo, data, tipo di evento */
    description: string;
    /** Note libere: contatti, orari, indicazioni tecniche */
    notes: string;
    /** Frame rate del timecode, per timeline e sincronizzazione */
    timecodeRate: TimecodeRate;
    /** Fade in predefinito di scene e cue, in secondi */
    fadeInSeconds: number;
    /** Fade out predefinito di scene e cue, in secondi */
    fadeOutSeconds: number;
}

/** Limiti dei tempi di fade, in secondi */
export const FADE_LIMITS = { min: 0, max: 600 } as const;

/** Valori predefiniti di un nuovo show */
export const DEFAULT_SHOW_SETTINGS: ShowSettings = {
    description: '',
    notes: '',
    timecodeRate: '25',
    fadeInSeconds: 0,
    fadeOutSeconds: 0
};

/**
 * Completa e corregge impostazioni lette da un file: i valori mancanti o
 * non validi prendono il predefinito.
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
