/**
 * Protezione della navigazione: le finestre restano sull'interfaccia
 * interna, i collegamenti esterni si aprono nel browser di sistema.
 */

import { shell, type WebContents } from 'electron';
import * as appProtocol from '../protocol/app-protocol';

/**
 * Indica se un indirizzo esterno può essere aperto nel browser di sistema.
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
 * Applica le regole di navigazione a un webContents.
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
