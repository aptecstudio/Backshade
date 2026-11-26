/**
 * grid.* methods: the pages of the virtual console of the open show. The
 * interface edits a copy and sends the whole grid, which is checked and
 * saved as an unsaved change of the show; grid.changed tells every window.
 */

import { normalizeGrid } from '../../shared/grid/grid';
import type { ShowSession } from '../shows/show-session';
import type { EventBus } from '../transport/event-bus';
import { requireObject } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Registers the methods of the service.
 */
export function registerGridService(router: RequestRouter, bus: EventBus, session: ShowSession): void {
    session.onContentChange((part) => {
        if (part === 'grid' || part === 'all') {
            bus.emit('grid.changed', {});
        }
    });

    router.register('grid.get', () => session.grid());

    router.register('grid.set', (params) => {
        session.setGrid(normalizeGrid(requireObject(params).grid));
        return session.grid();
    });
}
