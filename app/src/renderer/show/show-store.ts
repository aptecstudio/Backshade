/**
 * Stato dello show aperto lato interfaccia: copia dell'ultimo stato
 * ricevuto dal motore, aggiornata dall'evento show.changed.
 */

import { Emitter, type Unsubscribe } from '../../framework/ts/index.js';
import type { ShowSummary } from '../../shared/transport/engine-api.js';
import { engine } from '../transport/engine.js';

let current: ShowSummary | null = null;
const changes = new Emitter<ShowSummary | null>();
let started = false;

/**
 * Legge lo show aperto dal motore e inizia a seguirne i cambi.
 * Va chiamata una volta all'avvio dell'interfaccia.
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
 * Aggiorna lo stato con quello restituito da un metodo del motore.
 */
export function update(show: ShowSummary | null): void {
    current = show;
    changes.emit(show);
}

/** Show aperto, o null */
export function currentShow(): ShowSummary | null {
    return current;
}

/**
 * Registra un listener per i cambi dello show aperto.
 */
export function onShowChange(listener: (show: ShowSummary | null) => void): Unsubscribe {
    return changes.subscribe(listener);
}
