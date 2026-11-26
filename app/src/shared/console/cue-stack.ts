/**
 * Playback state of the cue list of the simple console. Times are given
 * as elapsed and total milliseconds at the moment of the event, so every
 * client can animate the progress with its own clock. Shared between
 * engine and interface.
 */

/** Progress of a timed phase (fade or wait before a follow) */
export interface CueTiming {
    /** Milliseconds elapsed when the state was sent */
    elapsed: number;
    /** Total milliseconds */
    duration: number;
}

/** State of the cue list */
export interface CueStackState {
    /** Cue on stage, null before the first Go or after a release */
    current: string | null;
    /** Cue that Go plays, null at the end of the list */
    next: string | null;
    /** Fades and follow are stopped */
    paused: boolean;
    /** Fade in of the current cue, null when done */
    fade: CueTiming | null;
    /** Wait before the next cue goes by itself, null without a follow */
    follow: CueTiming | null;
}
