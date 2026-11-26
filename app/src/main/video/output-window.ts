/**
 * Window of a video output: on the chosen display, fullscreen or at a
 * position and size, without frame. It shows the composition sent by the
 * engine; the last one is sent again when the page is ready.
 */

import { BrowserWindow, screen, type Display } from 'electron';
import { VIDEO_OUTPUT_CHANNEL, type ComposeMessage } from '../../shared/video/video-output-protocol';
import type { VideoOutputConfig, VideoDisplay } from '../../shared/video/video';
import { VIDEO_OUTPUT_PRELOAD_FILE } from '../paths';
import * as appProtocol from '../protocol/app-protocol';

const PAGE = 'renderer/video-output.html';

/**
 * Displays of the computer.
 */
export function listDisplays(): VideoDisplay[] {
    const primary = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((display, index) => ({
        id: String(display.id),
        label: display.label !== '' ? display.label : `Display ${index + 1}`,
        width: display.size.width,
        height: display.size.height,
        primary: display.id === primary
    }));
}

function displayOf(id: string): Display {
    return screen.getAllDisplays().find((display) => String(display.id) === id) ?? screen.getPrimaryDisplay();
}

export class OutputWindow {
    private readonly window: BrowserWindow;
    private ready = false;
    private last: ComposeMessage | null = null;

    constructor(config: VideoOutputConfig) {
        this.window = new BrowserWindow({
            show: false,
            frame: false,
            backgroundColor: '#000000',
            title: config.name,
            skipTaskbar: true,
            webPreferences: {
                preload: VIDEO_OUTPUT_PRELOAD_FILE,
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                autoplayPolicy: 'no-user-gesture-required',
                backgroundThrottling: false
            }
        });
        this.window.webContents.on('did-finish-load', () => {
            this.ready = true;
            if (this.last !== null) {
                this.compose(this.last);
            }
        });
        this.apply(config);
        void this.window.loadURL(appProtocol.pageUrl(PAGE));
        this.window.showInactive();
    }

    /**
     * Places the window on its display, fullscreen or at its position and size.
     */
    apply(config: VideoOutputConfig): void {
        const bounds = displayOf(config.display).bounds;
        this.window.setTitle(config.name);
        if (config.fullscreen) {
            this.window.setFullScreen(false);
            this.window.setBounds(bounds);
            this.window.setFullScreen(true);
        } else {
            this.window.setFullScreen(false);
            this.window.setBounds({
                x: bounds.x + config.x,
                y: bounds.y + config.y,
                width: config.width,
                height: config.height
            });
        }
    }

    /** Brings the window above the other windows */
    raise(): void {
        this.window.moveTop();
    }

    compose(message: ComposeMessage): void {
        this.last = message;
        if (this.ready && !this.window.isDestroyed()) {
            this.window.webContents.send(VIDEO_OUTPUT_CHANNEL, message);
        }
    }

    close(): void {
        if (!this.window.isDestroyed()) {
            this.window.destroy();
        }
    }
}
