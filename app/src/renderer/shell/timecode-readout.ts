/**
 * Timecode display of the top bar: the position of the timeline player,
 * in the timecode rate of the show, moved on with the clock of this window.
 */

import type { ReadoutDisplay, Unsubscribe } from '../../framework/ts/index.js';
import type { TimelineState } from '../../shared/timeline/timeline.js';
import { frameRate, timecode } from '../sections/timeline/timeline-time.js';
import { engine } from '../transport/engine.js';

/**
 * Keeps a display on the position of the timeline player.
 * @returns the function that stops following the engine
 */
export function followTimecode(display: ReadoutDisplay): Unsubscribe {
    let state: TimelineState | null = null;
    let fps = 25;
    let frame = 0;
    const load = async (): Promise<void> => {
        try {
            [state, fps] = await Promise.all([
                engine().request('timeline.getState'),
                engine().request('show.getSettings').then((settings) => frameRate(settings.timecodeRate))
            ]);
        } catch {
            // No show open: the display keeps its empty value
            state = null;
        }
    };
    const draw = (): void => {
        if (state !== null) {
            const position = state.playing ? state.position + (Date.now() - state.sentAt) / 1000 : state.position;
            display.setText(timecode(position, fps));
        }
        frame = requestAnimationFrame(draw);
    };
    const stops = [
        engine().on('timeline.stateChanged', ({ state: next }) => {
            state = next;
        }),
        engine().on('show.changed', () => void load())
    ];
    void load();
    frame = requestAnimationFrame(draw);
    return () => {
        cancelAnimationFrame(frame);
        stops.forEach((stop) => stop());
    };
}
