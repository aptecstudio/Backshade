/**
 * Scale stampate accanto ai fader. La posizione va da 0 (fondo) a 1 (cima).
 */

/** Tacca della scala di un fader */
export interface FaderTick {
    /** Posizione sulla corsa, da 0 a 1 */
    position: number;
    /** Testo della tacca */
    label: string;
}

/** Scala per le luci: da 100 a 0 */
export const LIGHT_SCALE: readonly FaderTick[] = [
    { position: 1, label: '100' },
    { position: 0.8, label: '80' },
    { position: 0.6, label: '60' },
    { position: 0.4, label: '40' },
    { position: 0.2, label: '20' },
    { position: 0, label: '0' }
];

/** Scala per l'audio: da +10 a -inf dB */
export const AUDIO_SCALE: readonly FaderTick[] = [
    { position: 1, label: '+10' },
    { position: 0.8, label: '0' },
    { position: 0.6, label: '-10' },
    { position: 0.4, label: '-20' },
    { position: 0.2, label: '-40' },
    { position: 0, label: '-inf' }
];
