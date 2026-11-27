/**
 * remoteView.* methods: the remote control of another instance inside the
 * main window. Desktop only: it acts on the window of this computer.
 */

import { isIP } from 'node:net';
import { EngineError } from '../transport/engine-error';
import { requireInteger, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import { requireDesktop } from '../transport/require-desktop';
import * as mainWindow from '../window/main-window';
import { closeRemote, openRemote } from '../window/remote-view';

/**
 * Registers the methods of the service.
 */
export function registerRemoteViewService(router: RequestRouter): void {
    router.register('remoteView.open', (params, context) => {
        requireDesktop(context);
        const input = requireObject(params);
        const address = requireString(input, 'address').trim();
        const port = requireInteger(input, 'port');
        if (isIP(address) === 0 && !/^[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(address) || port < 1 || port > 65535) {
            throw new EngineError('invalid-ip-address', `Invalid address: ${address}:${port}`);
        }
        const window = mainWindow.current();
        if (window !== null) {
            openRemote(window, `http://${isIP(address) === 6 ? `[${address}]` : address}:${port}/`);
        }
        return undefined;
    });

    router.register('remoteView.close', (_params, context) => {
        requireDesktop(context);
        closeRemote();
        return undefined;
    });
}
