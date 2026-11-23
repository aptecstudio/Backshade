/**
 * Finestra Informazioni: piccola, a dimensione fissa, figlia della finestra
 * principale. Una sola istanza: se è già aperta viene portata in primo piano.
 */

import { BrowserWindow } from 'electron';
import { ICON_FILE, PRELOAD_FILE } from '../paths';
import * as appProtocol from '../protocol/app-protocol';

// Colore della superficie (vedi docs/design)
const SURFACE_COLOR = '#16171a';
const PAGE = 'renderer/about.html';

let instance: BrowserWindow | null = null;

/**
 * Apre la finestra Informazioni, o la porta in primo piano se è già aperta.
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
