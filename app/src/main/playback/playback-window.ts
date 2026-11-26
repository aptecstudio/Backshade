/**
 * Playback window: a hidden window that plays the sound of the show (and,
 * in the next steps, drives the video outputs). It keeps playing whatever
 * section the interface shows. The engine sends it commands and receives its
 * reports; commands sent before it is ready wait in a queue.
 */

import { BrowserWindow, ipcMain, type IpcMainEvent } from 'electron';
import {
    PLAYBACK_COMMAND_CHANNEL,
    PLAYBACK_STATUS_CHANNEL,
    type PlaybackCommand,
    type PlaybackStatus
} from '../../shared/audio/playback-protocol';
import { PLAYBACK_PRELOAD_FILE } from '../paths';
import * as appProtocol from '../protocol/app-protocol';

const PAGE = 'renderer/playback.html';

export class PlaybackWindow {
    private window: BrowserWindow | null = null;
    private ready = false;
    private readonly queue: PlaybackCommand[] = [];
    private readonly listeners: Array<(status: PlaybackStatus) => void> = [];

    constructor() {
        ipcMain.on(PLAYBACK_STATUS_CHANNEL, (event: IpcMainEvent, status: PlaybackStatus) => {
            if (this.window === null || event.sender !== this.window.webContents) {
                return;
            }
            if (status.type === 'ready') {
                this.ready = true;
                this.queue.splice(0).forEach((command) => this.send(command));
            }
            this.listeners.forEach((listener) => listener(status));
        });
    }

    /**
     * Opens the window, hidden, if it is not open.
     */
    open(): void {
        if (this.window !== null) {
            return;
        }
        const window = new BrowserWindow({
            show: false,
            width: 320,
            height: 200,
            skipTaskbar: true,
            title: 'Backshade playback',
            webPreferences: {
                preload: PLAYBACK_PRELOAD_FILE,
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                autoplayPolicy: 'no-user-gesture-required',
                // Sound must not slow down while the window is hidden
                backgroundThrottling: false
            }
        });
        window.on('closed', () => {
            this.window = null;
            this.ready = false;
        });
        void window.loadURL(appProtocol.pageUrl(PAGE));
        this.window = window;
    }

    /**
     * Sends a command; it waits in the queue until the window is ready.
     */
    send(command: PlaybackCommand): void {
        if (this.window === null) {
            this.open();
        }
        if (!this.ready || this.window === null) {
            this.queue.push(command);
            return;
        }
        this.window.webContents.send(PLAYBACK_COMMAND_CHANNEL, command);
    }

    /** Registers a listener for the reports of the window */
    onStatus(listener: (status: PlaybackStatus) => void): void {
        this.listeners.push(listener);
    }

    /** Closes the window, when the application quits */
    close(): void {
        this.window?.destroy();
        this.window = null;
    }
}
