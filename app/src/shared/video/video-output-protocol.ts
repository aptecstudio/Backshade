/**
 * Messages from the engine to the video output windows: the layers to
 * show and the time of the transition to them.
 */

import type { LayerState } from './video.js';

/** Composition to show */
export interface ComposeMessage {
    layers: LayerState[];
    /** Transition time in seconds; zero is a cut */
    transition: number;
}

/** IPC channel of the video output windows */
export const VIDEO_OUTPUT_CHANNEL = 'backshade:video-output';

/** Bridge exposed by the preload to a video output window */
export interface VideoOutputBridge {
    onCompose(listener: (message: ComposeMessage) => void): void;
}
