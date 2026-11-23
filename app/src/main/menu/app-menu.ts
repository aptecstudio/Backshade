/**
 * Application menu.
 * - macOS: standard menu with system roles (texts translated by the system),
 *   with the native About panel; the Backshade About window
 *   opens from Settings, as on the other platforms.
 * - Windows and Linux: no menu in the packaged application, because
 *   the interface has its own navigation; during development the
 *   default Electron menu stays (reload, developer tools).
 */

import { app, Menu } from 'electron';

const WEBSITE_URL = 'https://www.aptecstudio.com';
const COPYRIGHT = 'Copyright (C) 2026 Aptec Studio';

/**
 * Installs the application menu. To be called after app.whenReady().
 */
export function installAppMenu(): void {
    if (process.platform === 'darwin') {
        app.setAboutPanelOptions({
            applicationName: 'Backshade',
            applicationVersion: app.getVersion(),
            copyright: COPYRIGHT,
            website: WEBSITE_URL
        });
        Menu.setApplicationMenu(Menu.buildFromTemplate([
            { role: 'appMenu' },
            { role: 'editMenu' },
            ...(app.isPackaged ? [] : [{ role: 'viewMenu' } as const]),
            { role: 'windowMenu' }
        ]));
        return;
    }

    if (app.isPackaged) {
        Menu.setApplicationMenu(null);
    }
}
