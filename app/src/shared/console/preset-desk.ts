/**
 * Two-preset desk of the simple console: two rows of faders (Preset A
 * and B) on raw DMX channels of a universe, with masters A and B in
 * crossfade, as on the hardware desks. Shared between engine and interface.
 */

/** Faders per row */
export const FADERS_PER_ROW = 12;

/** Working mode: two scenes with crossfade, or one row of 24 channels */
export type PresetMode = 'ab' | 'single';

/** Row of faders */
export type PresetRow = 'a' | 'b';

/** Master faders of the desk */
export type PresetMaster = 'a' | 'b' | 'scene';

/** State of the desk, apart from the fader levels */
export interface PresetDeskState {
    mode: PresetMode;
    /** Universe of the faders */
    universe: number;
    /** First DMX channel of the bank, from 1 */
    firstChannel: number;
    /**
     * Positions of the master faders, 0 to 1. Master B works reversed:
     * at the top it gives 0, so moving A and B together makes a crossfade.
     */
    masters: Record<PresetMaster, number>;
    /** Changes are prepared without reaching the output */
    blind: boolean;
    /** All intensity channels at full */
    fullOn: boolean;
}

/** Levels of the faders of a universe, 0 to 255 for each channel (index = channel - 1) */
export interface PresetLevels {
    universe: number;
    a: number[];
    b: number[];
}

/** Channels of a bank: 12 in A/B mode, 24 in single mode */
export function bankSize(mode: PresetMode): number {
    return mode === 'ab' ? FADERS_PER_ROW : FADERS_PER_ROW * 2;
}

/**
 * Level of Master B: reversed, as on the hardware desks.
 */
export function masterBLevel(position: number): number {
    return 1 - position;
}

/** Name of a channel for the displays of the desk */
export interface ChannelLabel {
    /** Fixture number */
    number: number;
    /** Name of the fixture, for example "Wash 3" */
    fixture: string;
    /** Name of the channel in the definition, for example "Red" */
    channel: string;
}
