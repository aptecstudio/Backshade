/**
 * Remote control inside the application: the interface of another instance
 * in an isolated view of the main window, below a bar of the local
 * interface. It has no bridge to this computer, no permissions, its own
 * storage, it stays on the address of that instance and opens nothing.
 * Leaving forgets the session, so opening it again asks the PIN.
 */

import { BrowserWindow, session, WebContentsView } from 'electron';
import { allowOrigin } from '../security/navigation-guard';
import { SURFACE_COLOR } from './main-window';

/** Height of the bar of the local interface above the view, in pixels */
export const REMOTE_BAR_HEIGHT = 48;
const PARTITION = 'persist:remote';

let open: { window: BrowserWindow; view: WebContentsView; resize: () => void } | null = null;

function remoteSession(): Electron.Session {
    const isolated = session.fromPartition(PARTITION);
    isolated.setPermissionCheckHandler(() => false);
    isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    return isolated;
}

/** Shows the interface of another instance over the main window */
export function openRemote(window: BrowserWindow, url: string): void {
    closeRemote();
    const view = new WebContentsView({
        webPreferences: { session: remoteSession(), contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    view.setBackgroundColor(SURFACE_COLOR);
    allowOrigin(view.webContents, new URL(url).origin);
    const resize = (): void => {
        const [width, height] = window.getContentSize();
        view.setBounds({ x: 0, y: REMOTE_BAR_HEIGHT, width, height: Math.max(0, height - REMOTE_BAR_HEIGHT) });
    };
    window.contentView.addChildView(view);
    resize();
    window.on('resize', resize);
    window.on('enter-full-screen', resize);
    window.on('leave-full-screen', resize);
    window.once('closed', closeRemote);
    open = { window, view, resize };
    void view.webContents.loadURL(url).catch((error: unknown) => console.warn('Remote instance not reachable:', error instanceof Error ? error.message : error));
}

export function closeRemote(): void {
    if (open === null) {
        return;
    }
    const { window, view, resize } = open;
    open = null;
    if (!window.isDestroyed()) {
        window.off('resize', resize);
        window.off('enter-full-screen', resize);
        window.off('leave-full-screen', resize);
        window.off('closed', closeRemote);
        window.contentView.removeChildView(view);
    }
    view.webContents.close();
    // The preferences of the view (language, touch) stay, the session does not
    void remoteSession().clearStorageData({ storages: ['cookies'] });
}
