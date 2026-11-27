/**
 * stage.* methods: the layout of the 3D stage of the open show and its
 * window. The editor sends the whole stage, which is checked and saved as an
 * unsaved change; stage.changed tells every window. A fixture removed from
 * the patch leaves the stage.
 */

import { normalizeStage } from '../../shared/stage/stage';
import type { ShowSession } from '../shows/show-session';
import type { EventBus } from '../transport/event-bus';
import { requireObject } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import { requireDesktop } from '../transport/require-desktop';
import { openStage } from '../window/stage-window';

/**
 * Registers the methods of the service.
 */
export function registerStageService(router: RequestRouter, bus: EventBus, session: ShowSession): void {
    session.onContentChange((part) => {
        if (part === 'patch' && session.summary() !== null) {
            const patched = new Set(session.patch().fixtures.map((fixture) => fixture.id));
            const objects = session.stage().objects.filter((object) => object.fixture === null || patched.has(object.fixture));
            session.setStage(normalizeStage({ objects }));
        }
        if (part === 'stage' || part === 'all') {
            bus.emit('stage.changed', {});
        }
    });

    router.register('stage.get', () => session.stage());

    router.register('stage.set', (params) => {
        session.setStage(normalizeStage(requireObject(params).stage));
        return session.stage();
    });

    // The window acts on this computer only
    router.register('stage.open', (_params, context) => {
        requireDesktop(context);
        openStage();
        return undefined;
    });
}
