/**
 * Stage layout being edited: a copy of the stage of the show with its undo
 * history. Every change is sent to the engine, which saves it as an unsaved
 * change of the show.
 */

import { Emitter, type Unsubscribe } from '../../framework/ts/index.js';
import type { StageObject } from '../../shared/stage/stage.js';
import { showError } from '../dialogs/show-error.js';
import { engine } from '../transport/engine.js';

const HISTORY = 100;

export class StageDocument {
    private current: StageObject[] = [];
    private undone: StageObject[][] = [];
    private done: StageObject[][] = [];
    private readonly changes = new Emitter<void>();
    /** Requests still waiting: what the engine says meanwhile is already known */
    private sending = 0;

    get objects(): readonly StageObject[] {
        return this.current;
    }

    get canUndo(): boolean {
        return this.done.length > 0;
    }

    get canRedo(): boolean {
        return this.undone.length > 0;
    }

    onChange(listener: () => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    /** Reads the stage of the open show; a different show starts a new history */
    async load(newShow: boolean): Promise<void> {
        if (this.sending > 0 && !newShow) {
            return;
        }
        const { objects } = await engine().request('stage.get');
        if (newShow) {
            this.done = [];
            this.undone = [];
        }
        this.current = objects;
        this.changes.emit();
    }

    clear(): void {
        this.current = [];
        this.done = [];
        this.undone = [];
        this.changes.emit();
    }

    apply(objects: StageObject[]): void {
        if (JSON.stringify(objects) === JSON.stringify(this.current)) {
            return;
        }
        this.done = [...this.done.slice(-HISTORY + 1), this.current];
        this.undone = [];
        this.send(objects);
    }

    undo(): void {
        const previous = this.done.pop();
        if (previous !== undefined) {
            this.undone.push(this.current);
            this.send(previous);
        }
    }

    redo(): void {
        const next = this.undone.pop();
        if (next !== undefined) {
            this.done.push(this.current);
            this.send(next);
        }
    }

    private send(objects: StageObject[]): void {
        this.current = objects;
        this.changes.emit();
        this.sending++;
        void engine().request('stage.set', { stage: { objects } }).then(
            () => {
                this.sending--;
            },
            async (error: unknown) => {
                this.sending--;
                await showError(error);
                await this.load(false);
            }
        );
    }
}
