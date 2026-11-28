/**
 * Counts the frames really drawn by the live view and, for the automatic
 * quality, chooses the level the computer keeps up with.
 */

import { QUALITY_LEVELS, type QualityLevel } from './stage-live-settings.js';

/** Seconds too slow before the quality goes down, and fast enough before it goes up */
const SLOW_SECONDS = 3;
const FAST_SECONDS = 15;
/** Seconds fast enough before a level that was too heavy is tried again */
const RETRY_SECONDS = 120;
/** Seconds not judged after a start or a change of level, while the computer prepares it */
const SETTLE_SECONDS = 3;

export class StageFrameMeter {
    private count = 0;
    private since = 0;
    private last = 0;
    private slow = 0;
    private fast = 0;
    private settle = SETTLE_SECONDS;
    private level: QualityLevel = 'medium';
    /** Highest level that has not proved too heavy */
    private ceiling = QUALITY_LEVELS.length - 1;

    /** Level chosen by the automatic quality */
    get quality(): QualityLevel {
        return this.level;
    }

    reset(): void {
        this.count = 0;
        this.since = 0;
        this.slow = 0;
        this.fast = 0;
        this.settle = SETTLE_SECONDS;
    }

    /**
     * A frame was drawn.
     * @param now - Time in milliseconds
     * @param target - Frames per second asked for
     * @returns the frames per second of the last second, once a second
     */
    frame(now: number, target: number): number | null {
        // After a pause, such as a hidden window, the count starts again
        if (this.since === 0 || now - this.last > 1500) {
            this.since = now;
            this.count = 0;
        }
        this.last = now;
        this.count++;
        if (now - this.since < 1000) {
            return null;
        }
        const rate = Math.round(((this.count - 1) * 1000) / (now - this.since));
        this.since = now;
        this.count = 1;
        this.adapt(rate, target);
        return rate;
    }

    private adapt(rate: number, target: number): void {
        if (this.settle > 0) {
            this.settle--;
            return;
        }
        this.slow = rate < target * 0.8 ? this.slow + 1 : 0;
        this.fast = rate >= target * 0.95 ? this.fast + 1 : 0;
        const index = QUALITY_LEVELS.indexOf(this.level);
        if (this.slow >= SLOW_SECONDS && index > 0) {
            this.ceiling = index - 1;
            this.change(index - 1);
        } else if (index < QUALITY_LEVELS.length - 1 && this.fast >= (index < this.ceiling ? FAST_SECONDS : RETRY_SECONDS)) {
            this.ceiling = QUALITY_LEVELS.length - 1;
            this.change(index + 1);
        }
    }

    private change(index: number): void {
        this.level = QUALITY_LEVELS[index];
        this.slow = 0;
        this.fast = 0;
        this.settle = SETTLE_SECONDS;
    }
}
