/**
 * Cue list of the simple console in performance: Go plays the next cue
 * with a crossfade (the previous cue fades out while the new one fades
 * in), Back plays the previous cue, Pause stops the fades and the follow
 * wait, and Go after Pause continues them. A cue with a follow time makes
 * the next cue go by itself that many seconds after its own Go.
 */

import type { CueStackState, CueTiming } from '../../shared/console/cue-stack';
import type { Cue } from '../../shared/console/memories';
import type { MemoryPlayer } from './memory-player';

/** What the cue list needs from the rest of the engine */
export interface CueStackContext {
    player: MemoryPlayer;
    /** Cues of the open show in order, empty when no show is open */
    cues: () => readonly Cue[];
    /** Called at every change of the state */
    onState: (state: CueStackState) => void;
    /** Current time in milliseconds */
    now?: () => number;
}

export class CueStack {
    private readonly context: CueStackContext;
    private readonly now: () => number;
    private current: string | null = null;
    /** Next cue chosen by the operator, null to follow the list */
    private chosenNext: string | null = null;
    private paused = false;
    private pausedAt = 0;
    /** Time of the Go of the current cue, moved forward by the pauses */
    private wentAt = 0;
    private followTimer: NodeJS.Timeout | null = null;
    private fadeTimer: NodeJS.Timeout | null = null;

    constructor(context: CueStackContext) {
        this.context = context;
        this.now = context.now ?? (() => performance.now());
    }

    state(): CueStackState {
        return {
            current: this.current,
            next: this.nextCue()?.id ?? null,
            paused: this.paused,
            fade: this.current === null ? null : this.context.player.cueFade(this.current),
            follow: this.followTiming()
        };
    }

    /**
     * Plays the next cue; after Pause, continues the fades instead.
     */
    go(): void {
        if (this.paused) {
            this.resume();
            return;
        }
        const next = this.nextCue();
        if (next !== null) {
            this.play(next.id);
        }
    }

    /**
     * Plays the cue before the current one.
     */
    back(): void {
        const cues = this.context.cues();
        const index = cues.findIndex((cue) => cue.id === this.current);
        if (index > 0) {
            this.play(cues[index - 1].id);
        }
    }

    /**
     * Stops the fades and the follow wait, or continues them.
     */
    pause(): void {
        if (this.paused) {
            this.resume();
            return;
        }
        if (this.current === null) {
            return;
        }
        this.paused = true;
        this.pausedAt = this.now();
        this.context.player.setCuesPaused(true);
        this.clearTimers();
        this.announce();
    }

    /**
     * Chooses the cue that the next Go plays.
     */
    setNext(id: string): void {
        this.chosenNext = this.context.cues().some((cue) => cue.id === id) ? id : null;
        this.announce();
    }

    /**
     * Fades out the current cue; the next Go starts again from the cue after it.
     */
    release(): void {
        if (this.current === null) {
            return;
        }
        if (this.paused) {
            this.paused = false;
            this.context.player.setCuesPaused(false);
        }
        this.context.player.setCue(this.current, false);
        const cues = this.context.cues();
        const index = cues.findIndex((cue) => cue.id === this.current);
        this.chosenNext = this.chosenNext ?? cues[index + 1]?.id ?? null;
        this.current = null;
        this.clearTimers();
        this.announce();
    }

    /**
     * Follows a change of the cue list: deleted cues are forgotten.
     */
    cuesChanged(): void {
        const ids = new Set(this.context.cues().map((cue) => cue.id));
        if (this.current !== null && !ids.has(this.current)) {
            this.current = null;
            this.paused = false;
            this.clearTimers();
        }
        if (this.chosenNext !== null && !ids.has(this.chosenNext)) {
            this.chosenNext = null;
        }
        this.schedule();
        this.announce();
    }

    /**
     * Forgets everything at once, for example when the show is closed.
     */
    reset(): void {
        this.current = null;
        this.chosenNext = null;
        this.paused = false;
        this.clearTimers();
        this.announce();
    }

    private play(id: string): void {
        if (this.paused) {
            this.paused = false;
            this.context.player.setCuesPaused(false);
        }
        if (this.current !== null && this.current !== id) {
            this.context.player.setCue(this.current, false);
        }
        this.context.player.setCue(id, true);
        this.current = id;
        this.chosenNext = null;
        this.wentAt = this.now();
        this.schedule();
        this.announce();
    }

    private resume(): void {
        this.paused = false;
        this.wentAt += this.now() - this.pausedAt;
        this.context.player.setCuesPaused(false);
        this.schedule();
        this.announce();
    }

    private nextCue(): Cue | null {
        const cues = this.context.cues();
        const chosen = cues.find((cue) => cue.id === this.chosenNext);
        if (chosen !== undefined) {
            return chosen;
        }
        if (this.current === null) {
            return cues[0] ?? null;
        }
        const index = cues.findIndex((cue) => cue.id === this.current);
        return cues[index + 1] ?? null;
    }

    private followTiming(): CueTiming | null {
        const cue = this.context.cues().find((item) => item.id === this.current);
        if (cue === undefined || cue.follow === null || this.nextCue() === null) {
            return null;
        }
        const elapsed = (this.paused ? this.pausedAt : this.now()) - this.wentAt;
        return { elapsed: Math.max(0, elapsed), duration: cue.follow * 1000 };
    }

    /**
     * Starts the timers of the follow and of the end of the fade (to announce it).
     */
    private schedule(): void {
        this.clearTimers();
        if (this.paused || this.current === null) {
            return;
        }
        const follow = this.followTiming();
        if (follow !== null) {
            this.followTimer = setTimeout(() => this.go(), Math.max(0, follow.duration - follow.elapsed));
        }
        const fade = this.context.player.cueFade(this.current);
        if (fade !== null) {
            this.fadeTimer = setTimeout(() => this.announce(), Math.max(0, fade.duration - fade.elapsed) + 20);
        }
    }

    private clearTimers(): void {
        if (this.followTimer !== null) {
            clearTimeout(this.followTimer);
            this.followTimer = null;
        }
        if (this.fadeTimer !== null) {
            clearTimeout(this.fadeTimer);
            this.fadeTimer = null;
        }
    }

    private announce(): void {
        this.context.onState(this.state());
    }
}
