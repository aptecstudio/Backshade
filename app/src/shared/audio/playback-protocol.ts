/**
 * Messages between the engine and the playback window, which plays the
 * sound. The engine decides what plays; the window plays it and reports
 * positions, ends and errors. A voice is one playing file: during a
 * crossfade two voices sound together. Voices play on a bus, an audio output
 * with its own volume: the bus "player" of the audio player, one bus per
 * audio track of the timeline.
 */

import type { VideoInput } from '../video/video.js';
import type { AudioDevice } from './audio.js';

/** Command from the engine to the playback window */
export type PlaybackCommand =
    | {
        type: 'play';
        voice: string;
        /** Bus of the voice */
        bus: string;
        /** Address of the file, served by the app protocol */
        url: string;
        start: number;
        end: number | null;
        loop: boolean;
        /** Volume of the voice, 0 to 1 */
        volume: number;
        /** Fade in at the start and fade out before the end, in seconds */
        fadeIn: number;
        fadeOut: number;
    }
    | { type: 'stop'; voice: string; fade: number }
    | { type: 'pause'; voice: string }
    | { type: 'resume'; voice: string }
    | { type: 'volume'; voice: string; volume: number; ramp: number }
    | { type: 'output'; bus: string; device: string; volume: number }
    | { type: 'listDevices'; request: number }
    | { type: 'listVideoInputs'; request: number };

/** Report from the playback window to the engine */
export type PlaybackStatus =
    | { type: 'ready' }
    | { type: 'position'; voice: string; position: number; duration: number }
    | { type: 'ended'; voice: string }
    | { type: 'error'; voice: string; message: string }
    | { type: 'devices'; request: number; devices: AudioDevice[] }
    | { type: 'videoInputs'; request: number; inputs: VideoInput[] };

/** IPC channels of the playback window */
export const PLAYBACK_COMMAND_CHANNEL = 'backshade:playback-command';
export const PLAYBACK_STATUS_CHANNEL = 'backshade:playback-status';

/** Path of the show media in the app protocol */
export const SHOW_MEDIA_ROUTE = '/show-media/';
