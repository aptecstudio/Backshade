/**
 * Playback of the memories of the simple console. Several scenes and
 * chasers can be on at the same time (decided by the human): each one is
 * a source of the mixer, written in order of activation, so intensity
 * channels merge HTP and the other channels follow the memory turned on
 * last (LTP). Every channel follows the fade times of the scene: intensity
 * channels fade from and to zero and are scaled by the scene master, the
 * other channels move between the output without the scene and their
 * values (decided by the human). A chaser plays its scenes one per beat, with a crossfade between
 * steps as a part of the step time.
 */

import type { Chaser, MemoriesState, MemoryKind, Scene, ShowMemories } from '../../shared/console/memories';
import type { DmxMixer } from '../output/dmx-mixer';
import { nextStep, type SequencePosition } from './chaser-sequence';
import { IntensityMap, mixLevels, type ChannelValues } from './intensity-map';
import type { UniverseMapLookup } from './preset-desk';

/** Prefix of the mixer sources of the memories */
export const MEMORY_SOURCE_PREFIX = 'memory:';

// Interval of the playback updates while memories are on (40 per second)
const TICK_MS = 25;

/** What the player needs from the rest of the engine */
export interface MemoryPlayerContext {
    mixer: DmxMixer;
    mapOf: UniverseMapLookup;
    /** Memories of the open show, null when no show is open */
    memories: () => ShowMemories | null;
    /** Position of the scene master, 0 to 1 */
    sceneMaster: () => number;
    /** Called when memories turn on or off, a chaser changes step or the selected chaser changes */
    onState: (state: MemoriesState) => void;
    /** Current time in milliseconds */
    now?: () => number;
}

interface Playback {
    kind: MemoryKind;
    id: string;
    /** Time it was turned on */
    started: number;
    /** Time it was turned off, null while on */
    released: number | null;
    /** Level when it was turned off, the fade out starts from it */
    releaseLevel: number;
    /** Chasers: current and previous step, start of the current step */
    position: SequencePosition;
    previous: number | null;
    stepStarted: number;
    /** Levels written at the last update */
    written: Map<number, Array<[number, number]>>;
    /**
     * Fading out: per universe, the addresses where the memory still gave the
     * output when it was turned off; other sources keep the rest
     */
    owned: Map<number, Set<number>> | null;
}

/** Levels of a scene ready for playback: universe -> index -> value */
type SceneValues = Map<number, ChannelValues>;

export class MemoryPlayer {
    private readonly context: MemoryPlayerContext;
    private readonly now: () => number;
    private readonly playbacks: Playback[] = [];
    private readonly values = new WeakMap<Scene, SceneValues>();
    private selected: string | null = null;
    private timer: NodeJS.Timeout | null = null;

    constructor(context: MemoryPlayerContext) {
        this.context = context;
        this.now = context.now ?? (() => performance.now());
    }

    state(): MemoriesState {
        return {
            active: this.playbacks
                .filter((playback) => playback.released === null)
                .map((playback) => ({ kind: playback.kind, id: playback.id, step: playback.kind === 'chaser' ? playback.position.step : null })),
            selectedChaser: this.selected
        };
    }

    /**
     * Turns a memory on (with its fade in) or off (with its fade out).
     */
    setActive(kind: MemoryKind, id: string, on: boolean): void {
        const now = this.now();
        const existing = this.playbacks.find((playback) => playback.id === id);
        if (on) {
            if (kind === 'chaser') {
                this.selected = id;
            }
            if (existing !== undefined && existing.released === null) {
                this.announce();
                return;
            }
            if (existing !== undefined) {
                // Turned on again during its fade out: the fade in continues from the current level
                const level = this.level(existing, now);
                this.remove(existing);
                const fadeIn = this.fadeIn(kind, id);
                this.add(kind, id, now - level * fadeIn);
            } else {
                this.add(kind, id, now);
            }
        } else if (existing !== undefined && existing.released === null) {
            this.release(existing, now);
        }
        this.update();
        this.announce();
    }

    /**
     * Chooses the chaser that the tempo controls act on.
     */
    selectChaser(id: string | null): void {
        this.selected = id;
        this.announce();
    }

    /**
     * Turns every memory off with its fade out.
     */
    releaseAll(): void {
        const now = this.now();
        for (const playback of this.playbacks) {
            if (playback.released === null) {
                this.release(playback, now);
            }
        }
        this.update();
        this.announce();
    }

    /**
     * Stops every memory at once, for example when the show is closed.
     */
    stopAll(): void {
        for (const playback of [...this.playbacks]) {
            this.remove(playback);
        }
        this.selected = null;
        this.stopTimer();
        this.announce();
    }

    /**
     * Follows a change of the memories: deleted memories stop at once.
     */
    memoriesChanged(): void {
        const memories = this.context.memories();
        for (const playback of [...this.playbacks]) {
            if (this.find(playback.kind, playback.id, memories) === undefined) {
                this.remove(playback);
            }
        }
        if (this.selected !== null && memories?.chasers.some((chaser) => chaser.id === this.selected) !== true) {
            this.selected = null;
        }
        this.update();
        this.announce();
    }

    private add(kind: MemoryKind, id: string, started: number): void {
        this.playbacks.push({
            kind,
            id,
            started,
            released: null,
            releaseLevel: 1,
            position: { step: 0, heading: 1 },
            previous: null,
            stepStarted: this.now(),
            written: new Map(),
            owned: null
        });
        this.startTimer();
    }

    /**
     * Starts the fade out of a memory. Only the channels where it still gives
     * the output fade back; channels taken since by other sources stay theirs.
     */
    private release(playback: Playback, now: number): void {
        playback.releaseLevel = this.level(playback, now);
        playback.released = now;
        playback.owned = new Map();
        for (const [universe, levels] of playback.written) {
            const frame = this.context.mixer.compose(universe, this.context.mapOf(universe), 1);
            playback.owned.set(universe, new Set(levels.filter(([address, value]) => frame[address - 1] === value).map(([address]) => address)));
        }
    }

    private remove(playback: Playback): void {
        this.playbacks.splice(this.playbacks.indexOf(playback), 1);
        this.context.mixer.clearSource(MEMORY_SOURCE_PREFIX + playback.id);
    }

    private find(kind: MemoryKind, id: string, memories = this.context.memories()): Scene | Chaser | undefined {
        return kind === 'scene'
            ? memories?.scenes.find((scene) => scene.id === id)
            : memories?.chasers.find((chaser) => chaser.id === id);
    }

    /** Fade in of a memory in milliseconds; chasers start at once */
    private fadeIn(kind: MemoryKind, id: string): number {
        const memory = this.find(kind, id);
        return kind === 'scene' && memory !== undefined ? (memory as Scene).fadeIn * 1000 : 0;
    }

    private fadeOut(kind: MemoryKind, id: string): number {
        const memory = this.find(kind, id);
        return kind === 'scene' && memory !== undefined ? (memory as Scene).fadeOut * 1000 : 0;
    }

    /**
     * Fade level of a memory, 0 to 1.
     */
    private level(playback: Playback, now: number): number {
        if (playback.released !== null) {
            const fadeOut = this.fadeOut(playback.kind, playback.id);
            const progress = fadeOut <= 0 ? 1 : (now - playback.released) / fadeOut;
            return Math.max(0, playback.releaseLevel * (1 - progress));
        }
        const fadeIn = this.fadeIn(playback.kind, playback.id);
        return fadeIn <= 0 ? 1 : Math.max(0, Math.min(1, (now - playback.started) / fadeIn));
    }

    /**
     * Writes the levels of every memory into the mixer, in order of activation.
     */
    private update(): void {
        const now = this.now();
        const master = this.context.sceneMaster();
        const maps = new Map<number, IntensityMap>();
        const intensityOf = (universe: number): IntensityMap => {
            let map = maps.get(universe);
            if (map === undefined) {
                map = new IntensityMap(this.context.mapOf(universe));
                maps.set(universe, map);
            }
            return map;
        };
        let changed = false;
        for (const playback of [...this.playbacks]) {
            const level = this.level(playback, now);
            const memory = this.find(playback.kind, playback.id);
            if (memory === undefined || (playback.released !== null && level <= 0)) {
                this.remove(playback);
                continue;
            }
            let output: Map<number, Array<[number, number]>>;
            if (playback.kind === 'scene') {
                output = this.sceneOutput(this.sceneValues(memory as Scene), null, 1, level * master, level < 1 ? { source: MEMORY_SOURCE_PREFIX + playback.id, level } : null);
            } else {
                const result = this.chaserOutput(playback, memory as Chaser, now, level * master);
                changed ||= result.stepChanged;
                if (result.finished) {
                    this.remove(playback);
                    changed = true;
                    continue;
                }
                output = result.output;
            }
            if (playback.owned !== null) {
                output = this.keepOwned(output, playback.owned, intensityOf);
            }
            playback.written = output;
            this.context.mixer.replaceSource(MEMORY_SOURCE_PREFIX + playback.id, output);
        }
        if (this.playbacks.length === 0) {
            this.stopTimer();
        }
        if (changed) {
            this.announce();
        }
    }

    /**
     * Levels of a memory fading out: intensity channels, and the other
     * channels only where the memory still gave the output when turned off.
     */
    private keepOwned(output: Map<number, Array<[number, number]>>, owned: Map<number, Set<number>>, intensityOf: (universe: number) => IntensityMap): Map<number, Array<[number, number]>> {
        const kept = new Map<number, Array<[number, number]>>();
        for (const [universe, levels] of output) {
            const intensity = intensityOf(universe);
            const addresses = owned.get(universe);
            const result = levels.filter(([address]) => intensity.scaled(address - 1) || addresses?.has(address) === true);
            if (result.length > 0) {
                kept.set(universe, result);
            }
        }
        return kept;
    }

    private chaserOutput(playback: Playback, chaser: Chaser, now: number, factor: number): { output: Map<number, Array<[number, number]>>; stepChanged: boolean; finished: boolean } {
        const scenes = chaser.steps
            .map((id) => this.context.memories()?.scenes.find((scene) => scene.id === id))
            .filter((scene): scene is Scene => scene !== undefined);
        if (scenes.length === 0) {
            return { output: new Map(), stepChanged: false, finished: false };
        }
        const stepMs = 60000 / chaser.bpm;
        let stepChanged = false;
        if (playback.position.step >= scenes.length) {
            playback.position = { step: 0, heading: 1 };
            playback.previous = null;
            stepChanged = true;
        }
        // After a long pause (or a much slower tempo) the chaser starts the next step now
        if (now - playback.stepStarted > stepMs * 4) {
            playback.stepStarted = now - stepMs;
        }
        while (playback.released === null && now - playback.stepStarted >= stepMs) {
            const next = nextStep(chaser.direction, playback.position, scenes.length);
            if (next === null) {
                return { output: new Map(), stepChanged: true, finished: true };
            }
            playback.previous = playback.position.step;
            playback.position = next;
            playback.stepStarted += stepMs;
            stepChanged = true;
        }
        const fadeMs = chaser.fade * stepMs;
        const progress = playback.previous === null || fadeMs <= 0 ? 1 : Math.min(1, (now - playback.stepStarted) / fadeMs);
        const target = this.sceneValues(scenes[playback.position.step]);
        const source = playback.previous === null || progress >= 1 ? null : this.sceneValues(scenes[playback.previous]);
        return { output: this.sceneOutput(target, source, progress, factor), stepChanged, finished: false };
    }

    /**
     * Levels of a scene, or of a crossfade between two scenes.
     * @param fade - While the memory fades: its mixer source, left out to know
     *   what the channels that are not intensity fade from, and its level
     */
    private sceneOutput(
        target: SceneValues,
        source: SceneValues | null,
        progress: number,
        factor: number,
        fade: { source: string; level: number } | null = null
    ): Map<number, Array<[number, number]>> {
        const output = new Map<number, Array<[number, number]>>();
        const universes = new Set([...target.keys(), ...(source?.keys() ?? [])]);
        for (const universe of universes) {
            const map = this.context.mapOf(universe);
            const intensity = new IntensityMap(map);
            const base = fade === null ? null : { values: this.context.mixer.compose(universe, map, 1, fade.source), level: fade.level };
            const levels = mixLevels(source?.get(universe) ?? null, target.get(universe) ?? new Map(), source === null ? 1 : progress, factor, intensity, base);
            if (levels.length > 0) {
                output.set(universe, levels);
            }
        }
        return output;
    }

    private sceneValues(scene: Scene): SceneValues {
        let values = this.values.get(scene);
        if (values === undefined) {
            values = new Map(scene.levels.map((item) => [item.universe, new Map(item.channels.map(([channel, value]) => [channel - 1, value]))]));
            this.values.set(scene, values);
        }
        return values;
    }

    private startTimer(): void {
        if (this.timer === null) {
            this.timer = setInterval(() => this.update(), TICK_MS);
        }
    }

    private stopTimer(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private announce(): void {
        this.context.onState(this.state());
    }
}
