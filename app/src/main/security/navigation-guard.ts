/**
 * Navigation protection: windows stay on the internal interface,
 * external links open in the system browser.
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

/**
 * Applies the navigation rules to a webContents.
 */
export function protect(contents: WebContents): void {
    contents.on('will-navigate', (event, targetUrl) => {
        if (!appProtocol.isInternalUrl(targetUrl)) {
            event.preventDefault();
        }
    });

    contents.setWindowOpenHandler(({ url }) => {
        if (isSafeExternalUrl(url)) {
            void shell.openExternal(url);
        }
        return { action: 'deny' };
    });
}
