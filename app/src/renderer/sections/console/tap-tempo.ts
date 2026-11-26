/**
 * Tap tempo: the speed in beats per minute from the time between taps,
 * averaged over the last taps. A pause longer than two seconds starts a
 * new count.
 */

// Taps averaged, and pause that starts a new count
const MAX_TAPS = 5;
const RESET_MS = 2000;

export class TapTempo {
    private taps: number[] = [];

    /**
     * Registers a tap; returns the speed once there are two taps, otherwise null.
     * @param now - Time of the tap in milliseconds
     */
    tap(now: number = performance.now()): number | null {
        const last = this.taps[this.taps.length - 1];
        if (last !== undefined && now - last > RESET_MS) {
            this.taps = [];
        }
        this.taps.push(now);
        this.taps = this.taps.slice(-MAX_TAPS);
        if (this.taps.length < 2) {
            return null;
        }
        const interval = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1);
        return interval > 0 ? 60000 / interval : null;
    }
}
