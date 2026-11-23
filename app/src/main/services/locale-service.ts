/**
 * Evento locales.changed: avvisa le interfacce quando nella cartella
 * dell'utente viene aggiunto, modificato o rimosso un pacchetto di lingua.
 */

import { listLocales } from '../locales/locale-registry';
import { watchUserLocales } from '../locales/locale-watcher';
import type { EventBus } from '../transport/event-bus';

/**
 * Avvia la sorveglianza dei pacchetti e restituisce la funzione che la ferma.
 */
export function startLocaleService(bus: EventBus): () => void {
    return watchUserLocales(() => {
        bus.emit('locales.changed', { codes: listLocales().map((entry) => entry.code) });
    });
}
