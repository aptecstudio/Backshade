/**
 * Bridge exposed by the preload to the playback window.
 */

import type { PlaybackCommand, PlaybackStatus } from './playback-protocol.js';

export interface PlaybackBridge {
    /** Registers the receiver of the engine commands */
    onCommand(listener: (command: PlaybackCommand) => void): void;
    /** Sends a report to the engine */
    report(status: PlaybackStatus): void;
}
