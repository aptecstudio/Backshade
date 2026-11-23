/**
 * About window: small, fixed size, child of the main
 * window. Single instance: if it is already open it is brought to the front.
 */

import { BrowserWindow } from 'electron';
import { ICON_FILE, PRELOAD_FILE } from '../paths';
import * as appProtocol from '../protocol/app-protocol';

// Surface color (see docs/design)
const SURFACE_COLOR = '#16171a';
const PAGE = 'renderer/about.html';

let instance: BrowserWindow | null = null;

/**
 * Opens the About window, or brings it to the front if it is already open.
 */
export function open(): void {
    if (instance !== null) {
        instance.focus();
        return;
    }

    const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const window = new BrowserWindow({
        width: 480,
        height: 560,
        parent,
        show: false,
        resizable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        autoHideMenuBar: true,
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
    window.removeMenu();

    window.once('ready-to-show', () => {
        window.show();
    });
    window.on('closed', () => {
        instance = null;
    });

    void window.loadURL(appProtocol.pageUrl(PAGE));
    instance = window;
}
