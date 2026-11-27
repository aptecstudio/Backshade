/**
 * What a remote client cannot do: act on the window of the computer, and
 * change the operator of the instance (a remote client always acts as the
 * operator entered there). Everything else is allowed, within that
 * operator's permissions.
 */

import type { EngineEvent, EngineMethod } from '../../shared/transport/engine-api';

export const LOCAL_ONLY_METHODS: ReadonlySet<EngineMethod> = new Set<EngineMethod>([
    'app.confirmClose',
    'window.openAbout',
    'window.isFullScreen',
    'window.toggleFullScreen',
    'operators.login',
    'operators.logout'
]);

/** Events meant only for the windows of the computer */
export const LOCAL_ONLY_EVENTS: ReadonlySet<EngineEvent> = new Set<EngineEvent>(['app.closeRequested', 'window.fullScreenChanged']);
