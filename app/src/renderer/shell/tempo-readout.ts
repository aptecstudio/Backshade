/**
 * Tempo display of the top bar: the speed of the selected chaser of the
 * simple console, or the empty value when no chaser is selected. A chaser
 * that follows the shared tempo shows the tempo of the timeline playing.
 */

import type { ReadoutDisplay, Unsubscribe } from '../../framework/ts/index.js';
import type { MemoriesState, MemoriesSummary } from '../../shared/console/memories.js';
import type { Timeline, TimelineState } from '../../shared/timeline/timeline.js';
import { engine } from '../transport/engine.js';

/**
 * Speed as shown on the display, for example "120.0".
 */
function formatBpm(bpm: number): string {
    return bpm.toFixed(1);
}

/**
 * Keeps a display on the speed of the selected chaser.
 * @param empty - Text shown without a selected chaser
 * @returns the function that stops following the engine
 */
export function followTempo(display: ReadoutDisplay, empty: string): Unsubscribe {
    let memories: MemoriesSummary | null = null;
    let state: MemoriesState | null = null;
    let timelines: Timeline[] = [];
    let timelineState: TimelineState | null = null;
    const render = (): void => {
        const chaser = memories?.chasers.find((item) => item.id === state?.selectedChaser);
        const playing = timelineState?.playing === true ? timelines.find((item) => item.id === timelineState?.timeline) : undefined;
        if (chaser === undefined) {
            display.setText(empty);
        } else {
            display.setText(formatBpm(chaser.followTempo && playing !== undefined ? playing.bpm : chaser.bpm));
        }
    };
    const loadTimelines = async (): Promise<void> => {
        try {
            [timelines, timelineState] = await Promise.all([engine().request('timeline.list').then((list) => list.timelines), engine().request('timeline.getState')]);
        } catch {
            timelines = [];
            timelineState = null;
        }
        render();
    };
    const load = async (): Promise<void> => {
        try {
            [memories, state] = await Promise.all([engine().request('memories.get'), engine().request('memories.getState')]);
        } catch {
            // No show open: no chaser to show
            memories = null;
            state = null;
        }
        render();
    };
    const stops = [
        engine().on('memories.changed', () => void load()),
        engine().on('memories.stateChanged', ({ state: next }) => {
            state = next;
            render();
        }),
        engine().on('show.changed', () => {
            void load();
            void loadTimelines();
        }),
        engine().on('timeline.changed', () => void loadTimelines()),
        engine().on('timeline.stateChanged', ({ state: next }) => {
            timelineState = next;
            render();
        })
    ];
    void load();
    void loadTimelines();
    return () => stops.forEach((stop) => stop());
}
