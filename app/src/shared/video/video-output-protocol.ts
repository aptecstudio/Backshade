/**
 * Messages from the engine to the video output windows: the layers to
 * show, the time of the transition to them and their videomapping.
 */

import type { MappingSurface } from './mapping.js';
import type { ShowTimer, TimerState } from './show-timer.js';
import type { GoboContext, TextGobo } from './text-gobo.js';
import type { LayerState } from './video.js';

/** Composition to show */
export interface ComposeMessage {
    layers: LayerState[];
    /** Transition time in seconds; zero is a cut */
    transition: number;
    /** Text gobo presets of the show, for the gobo layers */
    gobos: TextGobo[];
    /** Live data of the dynamic texts */
    context: GoboContext;
    /** Timer presets of the show and their live states */
    timers: ShowTimer[];
    timerStates: Record<string, TimerState>;
    /** Videomapping of the output */
    surfaces: MappingSurface[];
    /** A test image is shown on every surface instead of the program */
    testPattern: boolean;
    /** Name of the output, written on the test image */
    name: string;
}

/** IPC channel of the video output windows */
export const VIDEO_OUTPUT_CHANNEL = 'backshade:video-output';

/** Bridge exposed by the preload to a video output window */
export interface VideoOutputBridge {
    onCompose(listener: (message: ComposeMessage) => void): void;
}
