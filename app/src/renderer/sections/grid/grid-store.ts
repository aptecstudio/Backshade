/**
 * Live state followed by the widgets of the grid: desk, output, memories,
 * cue list, fixture groups and their levels, and the levels of the raw
 * channels in use. It loads everything once, follows the engine events and
 * tells the widgets when something changes.
 */

import { Emitter, type Unsubscribe } from '../../../framework/ts/index.js';
import type { PresetDeskState } from '../../../shared/console/preset-desk.js';
import type { AudioPlayback, ShowAudio } from '../../../shared/audio/audio.js';
import type { ShowTimer, TimerState } from '../../../shared/video/show-timer.js';
import type { CueStackState } from '../../../shared/console/cue-stack.js';
import type { MemoriesState, MemoriesSummary } from '../../../shared/console/memories.js';
import type { FixtureGroup } from '../../../shared/patch/groups.js';
import type { OutputState } from '../../../shared/transport/engine-api.js';
import { showError } from '../../dialogs/show-error.js';
import { onOutputState, outputState } from '../../output/output-store.js';
import { engine } from '../../transport/engine.js';

export class GridStore {
    desk: PresetDeskState | null = null;
    output: OutputState | null = outputState();
    memories: MemoriesSummary = { scenes: [], chasers: [], cues: [] };
    playback: MemoriesState = { active: [], selectedChaser: null };
    cues: CueStackState = { current: null, next: null, paused: false, fade: null, follow: null };
    groups: FixtureGroup[] = [];
    groupLevels: Record<string, number> = {};
    audio: ShowAudio | null = null;
    audioPlayback: AudioPlayback = { item: null, paused: false, position: 0, duration: 0, fromScene: false };
    timers: ShowTimer[] = [];
    timerStates: Record<string, TimerState> = {};
    /** Levels of row A of the desk per universe, loaded for the channels in use */
    private readonly channelLevels = new Map<number, number[]>();
    private readonly changes = new Emitter<void>();
    private readonly stops: Unsubscribe[] = [];

    constructor() {
        const on = engine().on.bind(engine());
        this.stops.push(
            on('console.stateChanged', ({ state }) => this.set(() => { this.desk = state; })),
            onOutputState((state) => this.set(() => { this.output = state; })),
            on('memories.changed', () => void this.loadMemories()),
            on('memories.stateChanged', ({ state }) => this.set(() => { this.playback = state; })),
            on('cues.stateChanged', ({ state }) => this.set(() => { this.cues = state; })),
            on('console.groupLevelsChanged', ({ levels }) => this.set(() => { this.groupLevels = levels; })),
            on('patch.changed', () => void this.loadGroups()),
            on('audio.changed', () => void engine().request('audio.get').then((audio) => this.set(() => { this.audio = audio; })).catch(showError)),
            on('audio.stateChanged', ({ state }) => this.set(() => { this.audioPlayback = state; })),
            on('video.changed', () => void engine().request('video.get').then((video) => this.set(() => { this.timers = video.timers; })).catch(showError)),
            on('video.timersChanged', ({ states }) => this.set(() => { this.timerStates = states; })),
            on('console.faderChanged', ({ row, universe, channel, value }) => this.setChannel(row, universe, [[channel, value]])),
            on('console.fadersChanged', ({ row, universe, channels }) => this.setChannel(row, universe, channels)),
            on('console.levelsChanged', () => this.reloadChannels())
        );
        void this.load();
        // Timer monitors move on by themselves
        const ticker = window.setInterval(() => {
            if (this.timers.length > 0) {
                this.changes.emit();
            }
        }, 500);
        this.stops.push(() => window.clearInterval(ticker));
    }

    /** Registers a listener for every change */
    onChange(listener: () => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    /**
     * Level of a raw channel on row A of the desk, 0 to 255; loads the universe the first time.
     */
    channelLevel(universe: number, channel: number): number {
        const levels = this.channelLevels.get(universe);
        if (levels === undefined) {
            this.channelLevels.set(universe, []);
            void this.loadUniverse(universe);
            return 0;
        }
        return levels[channel - 1] ?? 0;
    }

    dispose(): void {
        this.stops.forEach((stop) => stop());
        this.changes.clear();
    }

    private set(change: () => void): void {
        change();
        this.changes.emit();
    }

    private setChannel(row: 'a' | 'b', universe: number, channels: ReadonlyArray<readonly [number, number]>): void {
        const levels = this.channelLevels.get(universe);
        if (row !== 'a' || levels === undefined) {
            return;
        }
        this.set(() => channels.forEach(([channel, value]) => { levels[channel - 1] = value; }));
    }

    private reloadChannels(): void {
        for (const universe of this.channelLevels.keys()) {
            void this.loadUniverse(universe);
        }
    }

    private async loadUniverse(universe: number): Promise<void> {
        try {
            const levels = await engine().request('console.getLevels', { universe });
            this.set(() => this.channelLevels.set(universe, levels.a));
        } catch (error) {
            await showError(error);
        }
    }

    private async loadMemories(): Promise<void> {
        try {
            const memories = await engine().request('memories.get');
            this.set(() => { this.memories = memories; });
        } catch (error) {
            await showError(error);
        }
    }

    private async loadGroups(): Promise<void> {
        try {
            const groups = await engine().request('patch.getGroups');
            this.set(() => { this.groups = groups; });
        } catch (error) {
            await showError(error);
        }
    }

    private async load(): Promise<void> {
        try {
            const [desk, memories, playback, cues, groups, groupLevels, output, audio, audioPlayback, video, timerStates] = await Promise.all([
                engine().request('console.getState'),
                engine().request('memories.get'),
                engine().request('memories.getState'),
                engine().request('cues.getState'),
                engine().request('patch.getGroups'),
                engine().request('console.getGroupLevels'),
                engine().request('output.getState'),
                engine().request('audio.get'),
                engine().request('audio.getState'),
                engine().request('video.get'),
                engine().request('video.getTimers')
            ]);
            this.set(() => Object.assign(this, { desk, memories, playback, cues, groups, groupLevels, output, audio, audioPlayback, timers: video.timers, timerStates }));
        } catch (error) {
            await showError(error);
        }
    }
}
