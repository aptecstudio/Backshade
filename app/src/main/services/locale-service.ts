/**
 * locales.changed event: notifies the interfaces when a language pack is
 * added, changed or removed in the user folder.
 */

import { listLocales } from '../locales/locale-registry';
import { watchUserLocales } from '../locales/locale-watcher';
import type { EventBus } from '../transport/event-bus';

/**
 * Starts watching the packs and returns the function that stops it.
 */
export function startLocaleService(bus: EventBus): () => void {
    return watchUserLocales(() => {
        bus.emit('locales.changed', { codes: listLocales().map((entry) => entry.code) });
    });
}
