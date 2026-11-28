/**
 * Video outputs of the show in performance: one window per enabled output,
 * stacked in their order, and for each output the layers in program (what
 * goes out) and in preview (the next composition, prepared). Take brings the
 * preview to program with a transition, as on a vision mixer. Scenes and
 * cues put their recorded program on the outputs with their fades and, when
 * they turn off, bring back what was there before. Video clips of a timeline
 * take their layer while they play, over the program.
 */

import {
    EMPTY_LAYER,
    normalizeLayers,
    type LayerState,
    type OutputComposition,
    type ShowVideo,
    type VideoOutputConfig
} from '../../shared/video/video';
import type { TimerState } from '../../shared/video/show-timer';
import type { GoboContext } from '../../shared/video/text-gobo';
import type { ComposeMessage } from '../../shared/video/video-output-protocol';
import { OutputWindow } from './output-window';

interface OutputRuntime {
    program: LayerState[];
    preview: LayerState[];
    /** Scene or cue that set the program, with the program it replaced */
    owner: { key: string; before: LayerState[] } | null;
}

export class VideoEngine {
    private readonly video: () => ShowVideo | null;
    private readonly onState: (compositions: Record<string, OutputComposition>) => void;
    private readonly runtime = new Map<string, OutputRuntime>();
    private readonly windows = new Map<string, OutputWindow>();
    /** Outputs showing their test image */
    private readonly tests = new Set<string>();
    private context: GoboContext = { cue: '', song: '' };
    /** Layers taken by the timeline: "output:index" -> layer */
    private readonly timeline = new Map<string, LayerState>();

    /**
     * @param video - Video outputs of the open show, null when no show is open
     * @param onState - Called when program or preview change
     */
    private readonly timerStates: () => Record<string, TimerState>;

    /**
     * @param timerStates - Live states of the timer screens
     */
    constructor(video: () => ShowVideo | null, onState: (compositions: Record<string, OutputComposition>) => void, timerStates: () => Record<string, TimerState>) {
        this.video = video;
        this.onState = onState;
        this.timerStates = timerStates;
    }

    /** Program and preview of every output */
    compositions(): Record<string, OutputComposition> {
        const result: Record<string, OutputComposition> = {};
        for (const output of this.outputs()) {
            const state = this.state(output);
            result[output.id] = { program: structuredClone(state.program), preview: structuredClone(state.preview) };
        }
        return result;
    }

    /** Program of every output, as a scene records it */
    programs(): Record<string, LayerState[]> {
        return Object.fromEntries(Object.entries(this.compositions()).map(([id, composition]) => [id, composition.program]));
    }

    /**
     * Opens, places and stacks the windows after a change of the outputs.
     */
    sync(): void {
        const outputs = this.outputs();
        const ids = new Set(outputs.filter((output) => output.enabled).map((output) => output.id));
        for (const [id, window] of this.windows) {
            if (!ids.has(id)) {
                window.close();
                this.windows.delete(id);
            }
        }
        for (const output of outputs) {
            const state = this.state(output);
            state.program = normalizeLayers(state.program, output.layers);
            state.preview = normalizeLayers(state.preview, output.layers);
            if (!output.enabled) {
                continue;
            }
            let window = this.windows.get(output.id);
            if (window === undefined) {
                window = new OutputWindow(output);
                this.windows.set(output.id, window);
                window.compose(this.message(output, this.withTimeline(output.id, state.program), 0));
            } else {
                window.apply(output);
            }
        }
        // Lower stack first, so the highest ends on top
        [...outputs].filter((output) => output.enabled).sort((a, b) => a.stack - b.stack).forEach((output) => this.windows.get(output.id)?.raise());
        for (const id of [...this.runtime.keys()]) {
            if (!outputs.some((output) => output.id === id)) {
                this.runtime.delete(id);
            }
        }
        this.announce();
    }

    /**
     * Changes a layer of the program (at once) or of the preview.
     */
    setLayer(outputId: string, target: 'program' | 'preview', index: number, layer: LayerState): void {
        const output = this.outputs().find((item) => item.id === outputId);
        if (output === undefined || index < 0 || index >= output.layers) {
            return;
        }
        const state = this.state(output);
        state[target][index] = layer;
        if (target === 'program') {
            state.owner = null;
            this.send(output.id, 0.2);
        }
        this.announce();
    }

    /**
     * Moves a layer of the program (at once) or of the preview to another place of the stack.
     */
    moveLayer(outputId: string, target: 'program' | 'preview', from: number, to: number): void {
        const output = this.outputs().find((item) => item.id === outputId);
        if (output === undefined || from < 0 || from >= output.layers || to < 0 || to >= output.layers || from === to) {
            return;
        }
        const state = this.state(output);
        const [moved] = state[target].splice(from, 1);
        state[target].splice(to, 0, moved);
        if (target === 'program') {
            state.owner = null;
            this.send(output.id, 0.2);
        }
        this.announce();
    }

    /**
     * Brings the preview to program with a transition; the preview keeps a copy.
     * @param outputId - One output, or null for all
     */
    take(outputId: string | null, duration: number): void {
        for (const output of this.outputs()) {
            if (outputId !== null && output.id !== outputId) {
                continue;
            }
            const state = this.state(output);
            state.program = structuredClone(state.preview);
            state.owner = null;
            this.send(output.id, duration);
        }
        this.announce();
    }

    /** Scene or cue on: its program on the outputs, with its fade in (seconds) */
    startFromScene(key: string, programs: Record<string, LayerState[]>, fadeIn: number): void {
        for (const output of this.outputs()) {
            const layers = programs[output.id];
            if (layers === undefined) {
                continue;
            }
            const state = this.state(output);
            state.owner = { key, before: state.owner?.before ?? structuredClone(state.program) };
            state.program = normalizeLayers(layers, output.layers);
            this.send(output.id, fadeIn);
        }
        this.announce();
    }

    /** Scene or cue off: brings back the program it replaced, where it is still its own */
    stopFromScene(key: string, fadeOut: number): void {
        for (const output of this.outputs()) {
            const state = this.state(output);
            if (state.owner?.key === key) {
                state.program = normalizeLayers(state.owner.before, output.layers);
                state.owner = null;
                this.send(output.id, fadeOut);
            }
        }
        this.announce();
    }

    /**
     * Closes the windows and forgets the layers, when the show is closed.
     */
    reset(): void {
        this.windows.forEach((window) => window.close());
        this.windows.clear();
        this.runtime.clear();
        this.timeline.clear();
        this.tests.clear();
        this.announce();
    }

    private outputs(): VideoOutputConfig[] {
        return this.video()?.outputs ?? [];
    }

    private state(output: VideoOutputConfig): OutputRuntime {
        let state = this.runtime.get(output.id);
        if (state === undefined) {
            const empty = Array.from({ length: output.layers }, () => ({ ...EMPTY_LAYER }));
            state = { program: empty, preview: structuredClone(empty), owner: null };
            this.runtime.set(output.id, state);
        }
        return state;
    }

    private send(outputId: string, transition: number): void {
        const state = this.runtime.get(outputId);
        const output = this.outputs().find((item) => item.id === outputId);
        if (state !== undefined && output !== undefined) {
            this.windows.get(outputId)?.compose(this.message(output, this.withTimeline(outputId, state.program), transition));
        }
    }

    /**
     * Puts a layer of the timeline over a layer of an output, or gives the
     * layer back to the program with null.
     */
    setTimelineLayer(outputId: string, index: number, layer: LayerState | null): void {
        const key = `${outputId}:${index}`;
        const current = this.timeline.get(key);
        if (layer === null) {
            if (current === undefined) {
                return;
            }
            this.timeline.delete(key);
        } else {
            if (current !== undefined && JSON.stringify(current) === JSON.stringify(layer)) {
                return;
            }
            this.timeline.set(key, layer);
        }
        this.send(outputId, 0);
    }

    /**
     * Changes the live data of the dynamic texts and sends it to the outputs.
     */
    setContext(context: GoboContext): void {
        if (context.cue === this.context.cue && context.song === this.context.song) {
            return;
        }
        this.context = context;
        this.refresh();
    }

    /**
     * Sends again the program of every output, after a change of the gobo presets.
     */
    refresh(): void {
        for (const id of this.windows.keys()) {
            this.send(id, 0);
        }
    }

    /** Program of an output with the layers taken by the timeline */
    private withTimeline(outputId: string, program: LayerState[]): LayerState[] {
        return program.map((layer, index) => this.timeline.get(`${outputId}:${index}`) ?? layer);
    }

    /** Test image of an output on or off */
    setTestPattern(outputId: string, on: boolean): void {
        if (on) {
            this.tests.add(outputId);
        } else {
            this.tests.delete(outputId);
        }
        this.send(outputId, 0);
    }

    /** Outputs showing their test image */
    testPatterns(): string[] {
        return [...this.tests];
    }

    private message(output: VideoOutputConfig, layers: LayerState[], transition: number): ComposeMessage {
        return {
            layers, transition, gobos: this.video()?.gobos ?? [], context: this.context, timers: this.video()?.timers ?? [], timerStates: this.timerStates(),
            surfaces: output.surfaces, masks: output.masks, testPattern: this.tests.has(output.id), name: output.name
        };
    }

    private announce(): void {
        this.onState(this.compositions());
    }
}
