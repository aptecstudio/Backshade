/**
 * stage.* methods: the window of the 3D stage. Desktop only: it acts on the
 * windows of this computer.
 */

import type { RequestRouter } from '../transport/request-router';
import { requireDesktop } from '../transport/require-desktop';
import { openStage } from '../window/stage-window';

/**
 * Registers the methods of the service.
 */
export function registerStageService(router: RequestRouter): void {
    router.register('stage.open', (_params, context) => {
        requireDesktop(context);
        openStage();
        return undefined;
    });
}
