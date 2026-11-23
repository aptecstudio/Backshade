/**
 * recent.* methods: list of the recent shows and removal of an entry.
 */

import { listRecentShows, removeRecentShow } from '../shows/recent-shows';
import type { EventBus } from '../transport/event-bus';
import { requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Registers the methods of the service.
 */
export function registerRecentService(router: RequestRouter, bus: EventBus): void {
    router.register('recent.list', () => listRecentShows());

    router.register('recent.remove', (params) => {
        removeRecentShow(requireString(requireObject(params), 'folder'));
        bus.emit('recent.changed', {});
        return undefined;
    });
}
