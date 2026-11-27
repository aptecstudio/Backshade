/**
 * Preferences of the live view on this computer: haze, quality, frames per
 * second, beams and strobe.
 */

import { LocalPreference } from '../../framework/ts/index.js';

export const HAZE_LEVELS = ['none', 'light', 'medium', 'heavy'] as const;
export const QUALITY_LEVELS = ['low', 'medium', 'high'] as const;
export const FRAME_RATES = ['15', '30', '60'] as const;

export interface LiveSettings {
    haze: typeof HAZE_LEVELS[number];
    quality: typeof QUALITY_LEVELS[number];
    frameRate: typeof FRAME_RATES[number];
    beams: boolean;
    strobe: boolean;
}

const DEFAULTS: LiveSettings = { haze: 'medium', quality: 'medium', frameRate: '30', beams: true, strobe: true };

/** Brightness of the beams for each haze level */
export const HAZE_STRENGTH: Readonly<Record<LiveSettings['haze'], number>> = { none: 0.015, light: 0.09, medium: 0.18, heavy: 0.32 };

/** What each quality level draws: spot lights on the surfaces and pixel ratio */
export const QUALITY: Readonly<Record<LiveSettings['quality'], { spots: number; pixelRatio: number }>> = {
    low: { spots: 0, pixelRatio: 1 },
    medium: { spots: 8, pixelRatio: 1.5 },
    high: { spots: 24, pixelRatio: 2 }
};

const preference = new LocalPreference('backshade.stageLive');

export function readLiveSettings(): LiveSettings {
    let saved: Partial<Record<keyof LiveSettings, unknown>> = {};
    try {
        saved = JSON.parse(preference.get() ?? '{}') as typeof saved;
    } catch {
        // An unreadable preference gives the defaults
    }
    const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T => allowed.includes(value as T) ? value as T : fallback;
    return {
        haze: pick(saved.haze, HAZE_LEVELS, DEFAULTS.haze),
        quality: pick(saved.quality, QUALITY_LEVELS, DEFAULTS.quality),
        frameRate: pick(saved.frameRate, FRAME_RATES, DEFAULTS.frameRate),
        beams: pick(saved.beams, [true, false], DEFAULTS.beams),
        strobe: pick(saved.strobe, [true, false], DEFAULTS.strobe)
    };
}

export function saveLiveSettings(settings: LiveSettings): void {
    preference.set(JSON.stringify(settings));
}
