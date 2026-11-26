/**
 * Tempo display of the top bar: the speed of the selected chaser of the
 * simple console, or the empty value when no chaser is selected.
 */

import type { ReadoutDisplay, Unsubscribe } from '../../framework/ts/index.js';
import type { MemoriesState, MemoriesSummary } from '../../shared/console/memories.js';
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
    const render = (): void => {
        const chaser = memories?.chasers.find((item) => item.id === state?.selectedChaser);
        display.setText(chaser === undefined ? empty : formatBpm(chaser.bpm));
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
        engine().on('show.changed', () => void load())
    ];
    void load();
    return () => stops.forEach((stop) => stop());
}
