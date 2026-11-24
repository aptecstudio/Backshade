/**
 * State of the DMX output as the interface sees it: grand master,
 * blackout, workstation output and universes being sent. It follows the
 * output.stateChanged event, so every window and remote client agrees.
 */

import { Emitter, type Unsubscribe } from '../../framework/ts/index.js';
import type { OutputState } from '../../shared/transport/engine-api.js';
import { engine } from '../transport/engine.js';

let state: OutputState | null = null;
const changes = new Emitter<OutputState>();
let started = false;

function set(next: OutputState): void {
    state = next;
    changes.emit(next);
}

/**
 * Starts following the engine; it is called again safely.
 */
function start(): void {
    if (started) {
        return;
    }
    started = true;
    engine().on('output.stateChanged', ({ state: next }) => set(next));
    void engine().request('output.getState').then(set).catch((error: unknown) => console.error(error));
}

/** Last known state, or null before the first answer */
export function outputState(): OutputState | null {
    start();
    return state;
}

/**
 * Registers a listener for the state changes; it is called at once with the known state.
 */
export function onOutputState(listener: (next: OutputState) => void): Unsubscribe {
    start();
    if (state !== null) {
        listener(state);
    }
    return changes.subscribe(listener);
}

/**
 * Applies a state returned by a request, before its event arrives.
 */
export function applyOutputState(next: OutputState): void {
    set(next);
}
