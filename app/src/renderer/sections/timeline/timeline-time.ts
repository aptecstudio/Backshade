/**
 * Time on the timelines: timecode text, snap to the grid (bars, beats,
 * parts of a beat, seconds, frames) and the grid lines of the ruler.
 */

import { beatLength, type Timeline } from '../../../shared/timeline/timeline.js';

/** Snap of the clips and of the playhead */
export type SnapMode = 'off' | 'bar' | 'beat' | 'half' | 'quarter' | 'second' | 'frame';
export const SNAP_MODES: readonly SnapMode[] = ['off', 'bar', 'beat', 'half', 'quarter', 'second', 'frame'];

/** Frames per second of a timecode rate, for example "29.97df" */
export function frameRate(rate: string): number {
    return Math.round(parseFloat(rate)) || 25;
}

/**
 * Time as timecode "HH:MM:SS:FF".
 */
export function timecode(seconds: number, fps: number): string {
    const pad = (value: number): string => String(Math.floor(value)).padStart(2, '0');
    const total = Math.max(0, seconds);
    return `${pad(total / 3600)}:${pad((total % 3600) / 60)}:${pad(total % 60)}:${pad((total % 1) * fps)}`;
}

/** Length of one step of the grid, in seconds; zero when snap is off */
export function snapStep(mode: SnapMode, timeline: Pick<Timeline, 'bpm' | 'beatsPerBar'>, fps: number): number {
    const beat = beatLength(timeline);
    switch (mode) {
        case 'bar': return beat * timeline.beatsPerBar;
        case 'beat': return beat;
        case 'half': return beat / 2;
        case 'quarter': return beat / 4;
        case 'second': return 1;
        case 'frame': return 1 / fps;
        case 'off': return 0;
    }
}

/**
 * Time moved to the nearest step of the grid.
 */
export function snapTime(time: number, step: number): number {
    return step > 0 ? Math.max(0, Math.round(time / step) * step) : Math.max(0, time);
}
