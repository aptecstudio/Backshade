/**
 * Bridge of the playback window: it receives the commands of the engine
 * and sends back its reports. Nothing else of Electron is exposed.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { PlaybackBridge } from '../shared/audio/playback-bridge';
import type { PlaybackCommand, PlaybackStatus } from '../shared/audio/playback-protocol';

// Equal to shared/audio/playback-protocol.ts: the sandboxed preload cannot import other files
const COMMAND_CHANNEL = 'backshade:playback-command';
const STATUS_CHANNEL = 'backshade:playback-status';

const bridge: PlaybackBridge = {
    onCommand: (listener) => {
        const handler = (_event: IpcRendererEvent, command: PlaybackCommand): void => listener(command);
        ipcRenderer.on(COMMAND_CHANNEL, handler);
    },
    report: (status: PlaybackStatus) => {
        ipcRenderer.send(STATUS_CHANNEL, status);
    }
};

contextBridge.exposeInMainWorld('backshadePlayback', bridge);
