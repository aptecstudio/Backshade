/**
 * Live effects of the LED matrices, set in the Matrices section. They are
 * part of the desk: they reach the output at once (unless blind is on, then
 * the output keeps its last frame), the record key stores them in the scene
 * with the faders, and home turns them off. They are drawn about 40 times
 * per second while at least one is on.
 */

import type { PatchedMatrix } from '../../shared/patch/matrix';
import type { MatrixEffect } from '../../shared/patch/matrix-effect';
import type { DmxMixer } from '../output/dmx-mixer';
import { renderMatrixEffect } from './render-effect';

/** Source name of the live effects in the mixer */
export const MATRIX_LIVE_SOURCE = 'matrix-live';

const TICK_MS = 25;

/** What the live effects need from the rest of the engine */
export interface MatrixLiveContext {
    mixer: DmxMixer;
    /** Matrices of the open show */
    matrices: () => readonly PatchedMatrix[];
    /** The desk prepares changes without reaching the output */
    blind: () => boolean;
    now?: () => number;
}

interface LiveEffect {
    effect: MatrixEffect;
    started: number;
}

export class MatrixLive {
    private readonly context: MatrixLiveContext;
    private readonly now: () => number;
    private readonly live = new Map<string, LiveEffect>();
    private timer: NodeJS.Timeout | null = null;

    constructor(context: MatrixLiveContext) {
        this.context = context;
        this.now = context.now ?? (() => performance.now());
    }

    /** Live effects: matrix identifier -> effect */
    effects(): Record<string, MatrixEffect> {
        return Object.fromEntries([...this.live].map(([id, item]) => [id, structuredClone(item.effect)]));
    }

    /**
     * Sets the effect of a matrix, or turns it off with null. A change of
     * parameters keeps the running time, so the movement does not jump.
     */
    set(id: string, effect: MatrixEffect | null): void {
        if (effect === null) {
            this.live.delete(id);
        } else {
            const current = this.live.get(id);
            this.live.set(id, { effect, started: current !== undefined && current.effect.kind === effect.kind ? current.started : this.now() });
        }
        this.update();
    }

    /**
     * Turns every live effect off (home of the desk).
     */
    clear(): void {
        this.live.clear();
        this.update();
    }

    /**
     * Forgets the effects of matrices removed from the patch and draws again.
     */
    patchChanged(): void {
        const ids = new Set(this.context.matrices().map((matrix) => matrix.id));
        for (const id of [...this.live.keys()]) {
            if (!ids.has(id)) {
                this.live.delete(id);
            }
        }
        this.update();
    }

    private update(): void {
        if (this.live.size === 0) {
            this.stopTimer();
            this.context.mixer.clearSource(MATRIX_LIVE_SOURCE);
            return;
        }
        if (this.timer === null) {
            this.timer = setInterval(() => this.update(), TICK_MS);
        }
        if (this.context.blind()) {
            return;
        }
        const output = new Map<number, Array<[number, number]>>();
        const now = this.now();
        for (const matrix of this.context.matrices()) {
            const item = this.live.get(matrix.id);
            if (item === undefined) {
                continue;
            }
            for (const [universe, levels] of renderMatrixEffect(matrix, item.effect, (now - item.started) / 1000)) {
                output.set(universe, [...(output.get(universe) ?? []), ...levels]);
            }
        }
        this.context.mixer.replaceSource(MATRIX_LIVE_SOURCE, output);
    }

    private stopTimer(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
