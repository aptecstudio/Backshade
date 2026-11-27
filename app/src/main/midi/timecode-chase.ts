/**
 * The loaded timeline follows an external MIDI timecode: while the
 * timecode runs the timeline plays from the same point, located again when
 * it drifts; when the timecode stops (no quarter frames for a moment) the
 * timeline pauses; a full frame message while stopped moves the playhead.
 * The start timecode is the time of the timecode at the start of the
 * timeline.
 */

import type { MtcTime } from './mtc-reader';

// Distance from the timecode that locates the playhead again, in seconds
const DRIFT = 0.1;
// Time without quarter frames after which the timecode has stopped
const STOPPED_MS = 250;

/** What the chase drives */
export interface ChasedPlayer {
    playing(): boolean;
    position(): number;
    play(): void;
    pause(): void;
    locate(time: number): void;
}

export class TimecodeChase {
    private readonly player: ChasedPlayer;
    private lastRunning = 0;
    private timer: NodeJS.Timeout | null = null;

    constructor(player: ChasedPlayer) {
        this.player = player;
    }

    /**
     * A time read from the timecode.
     * @param start - Timecode of the start of the timeline, in seconds
     */
    follow(time: MtcTime, start: number): void {
        const position = Math.max(0, time.seconds - start);
        if (!time.running) {
            if (this.player.playing()) {
                this.player.pause();
            }
            this.player.locate(position);
            return;
        }
        this.lastRunning = Date.now();
        this.watch();
        if (!this.player.playing()) {
            this.player.locate(position);
            this.player.play();
        } else if (Math.abs(this.player.position() - position) > DRIFT) {
            this.player.locate(position);
        }
    }

    /** Stops following, for example when it is turned off */
    stop(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /** While the timecode runs, a pause in the quarter frames pauses the timeline */
    private watch(): void {
        if (this.timer !== null) {
            return;
        }
        this.timer = setInterval(() => {
            if (Date.now() - this.lastRunning > STOPPED_MS) {
                this.stop();
                if (this.player.playing()) {
                    this.player.pause();
                }
            }
        }, 50);
        this.timer.unref();
    }
}
