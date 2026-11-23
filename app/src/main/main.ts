/**
 * Punto di ingresso del processo main: gestisce solo il ciclo di vita
 * dell'applicazione e delega ogni compito ai moduli dedicati.
 */

import { app, BrowserWindow } from 'electron';
import { startEngine } from './engine/engine-host';
import { startPage } from './launch-options';
import * as localeRegistry from './locales/locale-registry';
import { installAppMenu } from './menu/app-menu';
import * as appProtocol from './protocol/app-protocol';
import * as navigationGuard from './security/navigation-guard';
import * as mainWindow from './window/main-window';

// Il protocollo interno va registrato prima che l'app sia pronta
appProtocol.registerScheme();

// Una sola istanza: un secondo avvio riporta in primo piano la finestra esistente
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        mainWindow.focus();
    });

    app.on('web-contents-created', (_event, contents) => {
        navigationGuard.protect(contents);
    });

    app.whenReady().then(() => {
        localeRegistry.ensureUserDirectory();
        appProtocol.handle();
        installAppMenu();
        startEngine();
        mainWindow.create(startPage());

        // macOS: riapre la finestra quando si clicca l'icona nel dock
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                mainWindow.create(startPage());
            }
        });
    });

    // Su macOS l'applicazione resta attiva finché l'utente non esce esplicitamente
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
