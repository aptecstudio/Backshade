/**
 * Main window of the application: creation, security options
 * and reference to the open instance.
 */

import { BrowserWindow } from 'electron';
import { ICON_FILE, PRELOAD_FILE } from '../paths';
import * as appProtocol from '../protocol/app-protocol';

// Surface color (see docs/design): avoids the white flash when opening
const SURFACE_COLOR = '#16171a';

let instance: BrowserWindow | null = null;
// Decides whether the window can close; false keeps it open
let closeGuard: () => boolean = () => true;
// The close has been confirmed by the user
let closeAllowed = false;

/**
 * Creates the main window, if it is not already open.
 * @param page - Interface page, relative to the web folder
 */
export function create(page: string): BrowserWindow {
    if (instance !== null) {
        return instance;
    }

    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 640,
        show: false,
        backgroundColor: SURFACE_COLOR,
        icon: ICON_FILE,
        title: 'Backshade',
        webPreferences: {
            preload: PRELOAD_FILE,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    window.once('ready-to-show', () => {
        window.show();
    });

    window.on('close', (event) => {
        if (!closeAllowed && !closeGuard()) {
            event.preventDefault();
        }
    });

    window.on('closed', () => {
        instance = null;
        closeAllowed = false;
    });

    void window.loadURL(appProtocol.pageUrl(page));

    instance = window;
    return window;
}

/**
 * Brings the main window to the front, restoring it if minimized.
 */
export function focus(): void {
    if (instance === null) {
        return;
    }
    if (instance.isMinimized()) {
        instance.restore();
    }
    instance.focus();
}

/**
 * Sets the function that decides whether the main window can close.
 */
export function setCloseGuard(guard: () => boolean): void {
    closeGuard = guard;
}

/**
 * Closes the main window after the confirmation of the user, without
 * asking again.
 */
export function closeConfirmed(): void {
    if (instance === null) {
        return;
    }
    closeAllowed = true;
    instance.close();
}
