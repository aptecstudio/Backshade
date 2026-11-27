/**
 * Main window of the application: creation, security options
 * and reference to the open instance.
 */

import { BrowserWindow } from 'electron';
import { ICON_FILE, PRELOAD_FILE } from '../paths';
import * as appProtocol from '../protocol/app-protocol';

// Surface color (see docs/design): avoids the white flash when opening
export const SURFACE_COLOR = '#16171a';

let instance: BrowserWindow | null = null;
// Decides whether the window can close; false keeps it open
let closeGuard: () => boolean = () => true;
// The close has been confirmed by the user
let closeAllowed = false;
// Called when the window enters or leaves fullscreen
const fullScreenListeners: Array<(on: boolean) => void> = [];

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

    window.on('enter-full-screen', () => fullScreenListeners.forEach((listener) => listener(true)));
    window.on('leave-full-screen', () => fullScreenListeners.forEach((listener) => listener(false)));

    window.on('closed', () => {
        instance = null;
        closeAllowed = false;
    });

    void window.loadURL(appProtocol.pageUrl(page));

    instance = window;
    return window;
}

/** The main window, null when closed */
export function current(): BrowserWindow | null {
    return instance;
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
 * Puts the main window in fullscreen or brings it back; returns the new state.
 */
export function toggleFullScreen(): boolean {
    if (instance === null) {
        return false;
    }
    const on = !instance.isFullScreen();
    instance.setFullScreen(on);
    return on;
}

/** The main window is fullscreen */
export function isFullScreen(): boolean {
    return instance?.isFullScreen() === true;
}

/**
 * Registers a listener for the fullscreen changes (key, menu or system).
 */
export function onFullScreen(listener: (on: boolean) => void): void {
    fullScreenListeners.push(listener);
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
