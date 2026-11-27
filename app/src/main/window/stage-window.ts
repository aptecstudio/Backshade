/**
 * Window of the 3D stage (Phase 13), opened on request from the top bar,
 * for example on a second screen while working at the console. Single
 * instance; it closes with the main window.
 */

import { BrowserWindow } from 'electron';
import { ICON_FILE, PRELOAD_FILE } from '../paths';
import * as appProtocol from '../protocol/app-protocol';
import * as mainWindow from './main-window';

const PAGE = 'renderer/stage.html';

let instance: BrowserWindow | null = null;

/** Opens the stage window, or brings it to the front */
export function openStage(): void {
    if (instance !== null) {
        if (instance.isMinimized()) {
            instance.restore();
        }
        instance.focus();
        return;
    }
    const window = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 560,
        show: false,
        backgroundColor: mainWindow.SURFACE_COLOR,
        icon: ICON_FILE,
        title: 'Backshade',
        autoHideMenuBar: true,
        webPreferences: {
            preload: PRELOAD_FILE,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });
    window.once('ready-to-show', () => window.show());
    const closeWithMain = (): void => window.close();
    const main = mainWindow.current();
    main?.once('closed', closeWithMain);
    window.on('closed', () => {
        instance = null;
        main?.off('closed', closeWithMain);
    });
    void window.loadURL(appProtocol.pageUrl(PAGE));
    instance = window;
}
