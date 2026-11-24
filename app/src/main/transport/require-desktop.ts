/**
 * Guard for the methods that act on the workstation (system dialogs,
 * windows, files): they are available only through IPC, never to remote clients.
 */

import { EngineError } from './engine-error';
import type { RequestContext } from './request-router';

/**
 * Throws "desktop-only" if the request does not come from the desktop application.
 */
export function requireDesktop(context: RequestContext): void {
    if (context.transport !== 'ipc') {
        throw new EngineError('desktop-only', 'Available only in the desktop application');
    }
}
