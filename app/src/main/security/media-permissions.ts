/**
 * Media permission (cameras, capture cards, names of the audio and video
 * devices): granted only to the windows of the application, the ones on
 * the internal protocol. Every other permission keeps the default behavior.
 */

import { session, type WebContents } from 'electron';
import * as appProtocol from '../protocol/app-protocol';

function isInternal(contents: WebContents | null): boolean {
    return contents !== null && appProtocol.isInternalUrl(contents.getURL());
}

/**
 * Installs the permission rules. To be called after app.whenReady().
 */
export function install(): void {
    session.defaultSession.setPermissionCheckHandler((contents, permission) => permission !== 'media' || isInternal(contents));
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(permission !== 'media' || isInternal(contents)));
}
