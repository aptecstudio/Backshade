/**
 * Menu dell'applicazione.
 * - macOS: menu standard con i ruoli di sistema (testi tradotti dal sistema),
 *   con il pannello Informazioni nativo; la finestra Informazioni di Backshade
 *   si apre dalle Impostazioni, come sulle altre piattaforme.
 * - Windows e Linux: nessun menu nell'applicazione distribuita, perché
 *   l'interfaccia ha la propria navigazione; durante lo sviluppo resta il
 *   menu predefinito di Electron (ricarica, strumenti di sviluppo).
 */

import { app, Menu } from 'electron';

const WEBSITE_URL = 'https://www.aptecstudio.com';
const COPYRIGHT = 'Copyright (C) 2026 Aptec Studio';

/**
 * Installa il menu dell'applicazione. Va chiamata dopo app.whenReady().
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
