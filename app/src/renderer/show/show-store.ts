/**
 * State of the open show on the interface side: copy of the last state
 * received from the engine, updated by the show.changed event.
 */

import { Emitter, type Unsubscribe } from '../../framework/ts/index.js';
import type { ShowSummary } from '../../shared/transport/engine-api.js';
import { engine } from '../transport/engine.js';

let current: ShowSummary | null = null;
const changes = new Emitter<ShowSummary | null>();
let started = false;

/**
 * Reads the open show from the engine and starts following its changes.
 * To be called once when the interface starts.
 */
export async function initShowStore(): Promise<void> {
    if (started) {
        return;
    }
    started = true;
    engine().on('show.changed', ({ show }) => update(show));
    update(await engine().request('show.getCurrent'));
}

/**
 * Updates the state with the one returned by an engine method.
 */
export function update(show: ShowSummary | null): void {
    current = show;
    changes.emit(show);
}

/** Open show, or null */
export function currentShow(): ShowSummary | null {
    return current;
}

/**
 * Registers a listener for changes of the open show.
 */
export function onShowChange(listener: (show: ShowSummary | null) => void): Unsubscribe {
    return changes.subscribe(listener);
}
