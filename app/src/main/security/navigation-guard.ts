/**
 * Navigation protection: windows stay on the internal interface,
 * external links open in the system browser. The view of the remote control
 * stays on the address of its instance and opens nothing.
 */

import { shell, type WebContents } from 'electron';
import * as appProtocol from '../protocol/app-protocol';

/**
 * Tells whether an external address can be opened in the system browser.
 */
function isSafeExternalUrl(targetUrl: string): boolean {
    try {
        const url = new URL(targetUrl);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
}

// Views of the remote control and the address they stay on
const remoteOrigins = new WeakMap<WebContents, string>();

/** Lets a view of the remote control stay on the address of its instance */
export function allowOrigin(contents: WebContents, origin: string): void {
    remoteOrigins.set(contents, origin);
}

function originOf(targetUrl: string): string | null {
    try {
        return new URL(targetUrl).origin;
    } catch {
        return null;
    }
}

/**
 * Applies the navigation rules to a webContents.
 */
export function protect(contents: WebContents): void {
    contents.on('will-navigate', (event, targetUrl) => {
        const remote = remoteOrigins.get(contents);
        const allowed = remote === undefined ? appProtocol.isInternalUrl(targetUrl) : originOf(targetUrl) === remote;
        if (!allowed) {
            event.preventDefault();
        }
    });

    contents.setWindowOpenHandler(({ url }) => {
        // A page of another instance never opens anything on this computer
        if (!remoteOrigins.has(contents) && isSafeExternalUrl(url)) {
            void shell.openExternal(url);
        }
        return { action: 'deny' };
    });
}
