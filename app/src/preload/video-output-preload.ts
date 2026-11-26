/**
 * Bridge of a video output window: it receives the compositions sent by
 * the engine. Nothing else of Electron is exposed.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { ComposeMessage, VideoOutputBridge } from '../shared/video/video-output-protocol';

// Equal to shared/video/video-output-protocol.ts: the sandboxed preload cannot import other files
const CHANNEL = 'backshade:video-output';

const bridge: VideoOutputBridge = {
    onCompose: (listener) => {
        ipcRenderer.on(CHANNEL, (_event: IpcRendererEvent, message: ComposeMessage) => listener(message));
    }
};

contextBridge.exposeInMainWorld('backshadeVideoOutput', bridge);
