/**
 * Entry point of the main process: it handles only the lifecycle of
 * the application and delegates every task to the dedicated modules.
 */

import { app, BrowserWindow } from 'electron';
import { startEngine } from './engine/engine-host';
import { startPage } from './launch-options';
import * as localeRegistry from './locales/locale-registry';
import { installAppMenu } from './menu/app-menu';
import * as appProtocol from './protocol/app-protocol';
import * as mediaPermissions from './security/media-permissions';
import * as navigationGuard from './security/navigation-guard';
import * as mainWindow from './window/main-window';

// The internal protocol must be registered before the app is ready
appProtocol.registerScheme();

// Single instance: a second launch brings the existing window to the front
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
        mediaPermissions.install();
        installAppMenu();
        startEngine();
        mainWindow.create(startPage());

        // macOS: reopens the window when the dock icon is clicked
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                mainWindow.create(startPage());
            }
        });
    });

    // On macOS the application stays active until the user quits explicitly
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
