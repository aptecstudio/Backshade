/**
 * Media permission (cameras, capture cards, names of the audio and video
 * devices) and MIDI permission (controllers, Phase 16.2): granted only to
 * the windows of the application, the ones on the internal protocol (the
 * application asks MIDI without system exclusive messages). Every other
 * permission keeps the default behavior.
 */

import { session, type WebContents } from 'electron';
import * as appProtocol from '../protocol/app-protocol';

function isInternal(contents: WebContents | null): boolean {
    return contents !== null && appProtocol.isInternalUrl(contents.getURL());
}

// Recent Chromium asks "midiSysex" for every Web MIDI access, also without system exclusive messages
const INTERNAL_ONLY = new Set(['media', 'midi', 'midiSysex']);

/**
 * Media and MIDI only for the windows of the application; the other
 * permissions keep the default behavior.
 */
function allowed(permission: string, contents: WebContents | null): boolean {
    return !INTERNAL_ONLY.has(permission) || isInternal(contents);
}

/**
 * Installs the permission rules. To be called after app.whenReady().
 */
export function install(): void {
    session.defaultSession.setPermissionCheckHandler((contents, permission) => allowed(permission, contents));
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(allowed(permission, contents)));
}
