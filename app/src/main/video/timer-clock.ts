/**
 * Live state of the timer screens: countdowns and stopwatches started,
 * paused, reset and changed by a minute. Clocks and countdowns to a time of
 * the day follow the wall clock and need no state. States belong to the
 * running session.
 */

import { IDLE_TIMER, type TimerAction, type TimerState } from '../../shared/video/show-timer';

// Change of the plus and minus commands
const MINUTE_MS = 60 * 1000;

export class TimerClock {
    private readonly states = new Map<string, TimerState>();

    /** States of every timer, as of now */
    snapshot(): Record<string, TimerState> {
        const now = Date.now();
        return Object.fromEntries([...this.states].map(([id, state]) => [id, this.at(state, now)]));
    }

    /**
     * Runs a command on a timer.
     */
    command(id: string, action: TimerAction): void {
        const now = Date.now();
        const state = this.at(this.states.get(id) ?? IDLE_TIMER, now);
        switch (action) {
            case 'toggle':
                state.running = !state.running;
                break;
            case 'start':
                state.running = true;
                break;
            case 'pause':
                state.running = false;
                break;
            case 'reset':
                state.running = false;
                state.elapsed = 0;
                state.adjust = 0;
                break;
            case 'plus':
                state.adjust += MINUTE_MS;
                break;
            case 'minus':
                state.adjust -= MINUTE_MS;
                break;
        }
        this.states.set(id, state);
    }

    /** Forgets the timers that are no longer in the show */
    keep(ids: ReadonlySet<string>): void {
        for (const id of [...this.states.keys()]) {
            if (!ids.has(id)) {
                this.states.delete(id);
            }
        }
    }

    clear(): void {
        this.states.clear();
    }

    /** State moved to a time, with the time counted so far */
    private at(state: TimerState, now: number): TimerState {
        return {
            running: state.running,
            elapsed: state.elapsed + (state.running ? Math.max(0, now - state.sentAt) : 0),
            adjust: state.adjust,
            sentAt: now
        };
    }
}
