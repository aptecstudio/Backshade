/**
 * Scales printed next to the faders. The position goes from 0 (bottom) to 1 (top).
 */

/** Mark of a fader scale */
export interface FaderTick {
    /** Position on the travel, from 0 to 1 */
    position: number;
    /** Mark text */
    label: string;
}

/** Scale for lights: from 100 to 0 */
export const LIGHT_SCALE: readonly FaderTick[] = [
    { position: 1, label: '100' },
    { position: 0.8, label: '80' },
    { position: 0.6, label: '60' },
    { position: 0.4, label: '40' },
    { position: 0.2, label: '20' },
    { position: 0, label: '0' }
];

/** Scale for audio: from +10 to -inf dB */
export const AUDIO_SCALE: readonly FaderTick[] = [
    { position: 1, label: '+10' },
    { position: 0.8, label: '0' },
    { position: 0.6, label: '-10' },
    { position: 0.4, label: '-20' },
    { position: 0.2, label: '-40' },
    { position: 0, label: '-inf' }
];
