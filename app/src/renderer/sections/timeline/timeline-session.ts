/**
 * Editing session of a timeline in this window: the timeline being
 * changed, undo and redo of every change, and the save to the engine. A
 * change of another window replaces the timeline and keeps the history.
 */

import { Emitter, type Unsubscribe } from '../../../framework/ts/index.js';
import type { Timeline } from '../../../shared/timeline/timeline.js';
import { showError } from '../../dialogs/show-error.js';
import { engine } from '../../transport/engine.js';

// Steps kept for undo
const HISTORY = 100;

export class TimelineSession {
    private current: Timeline;
    private readonly undoStack: string[] = [];
    private readonly redoStack: string[] = [];
    private readonly changes = new Emitter<Timeline>();

    constructor(timeline: Timeline) {
        this.current = timeline;
    }

    get timeline(): Timeline {
        return this.current;
    }

    get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /** Registers a listener for every change of the timeline */
    onChange(listener: (timeline: Timeline) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    /**
     * Applies a change: it can be undone, and it is saved in the show.
     * @param change - Changes a copy of the timeline
     */
    edit(change: (timeline: Timeline) => void): void {
        const before = JSON.stringify(this.current);
        const next = JSON.parse(before) as Timeline;
        change(next);
        if (JSON.stringify(next) === before) {
            return;
        }
        this.undoStack.push(before);
        if (this.undoStack.length > HISTORY) {
            this.undoStack.shift();
        }
        this.redoStack.length = 0;
        this.apply(next);
    }

    undo(): void {
        const previous = this.undoStack.pop();
        if (previous !== undefined) {
            this.redoStack.push(JSON.stringify(this.current));
            this.apply(JSON.parse(previous) as Timeline);
        }
    }

    redo(): void {
        const next = this.redoStack.pop();
        if (next !== undefined) {
            this.undoStack.push(JSON.stringify(this.current));
            this.apply(JSON.parse(next) as Timeline);
        }
    }

    /**
     * Takes the timeline saved by the engine (another window, a check of the engine).
     * @param undoable - The change can be undone here (a pass of the recorder)
     */
    replace(timeline: Timeline, undoable = false): void {
        if (JSON.stringify(timeline) !== JSON.stringify(this.current)) {
            if (undoable) {
                this.undoStack.push(JSON.stringify(this.current));
                if (this.undoStack.length > HISTORY) {
                    this.undoStack.shift();
                }
                this.redoStack.length = 0;
            }
            this.current = timeline;
            this.changes.emit(timeline);
        }
    }

    private apply(timeline: Timeline): void {
        this.current = timeline;
        this.changes.emit(timeline);
        void engine().request('timeline.save', { timeline }).catch(showError);
    }
}
