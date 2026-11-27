/**
 * Recorder of the timelines (Phase 8.7): while a timeline plays with the
 * record key on, the live actions become clips and curves on the armed
 * tracks. At every tick of the player it compares what is live with the
 * tick before:
 * - scenes and chasers turned on and off (memory keys, faders, cues) become
 *   light clips, with the fades they had;
 * - masters, groups and scene levels moved become points of the automation
 *   tracks with that target (written over the curve in the recorded time);
 * - the item of the audio player becomes an audio clip from the point of the
 *   file where it started;
 * - every change of the program of a video output layer becomes a video
 *   clip on the track of that output and layer.
 * Only changes are recorded: what is already live when recording starts is
 * left out. A pass ends when playback pauses, stops, jumps or recording is
 * turned off; its clips are then added to the timeline.
 */

import type { GridMaster } from '../../shared/grid/grid';
import { TIMELINE_LIMITS, type AutomationPoint, type AutomationTarget, type Clip, type ClipSource, type Timeline, type Track } from '../../shared/timeline/timeline';
import type { LayerState } from '../../shared/video/video';
import type { LivePlayback } from '../console/memory-player';

/** What is live in the rest of the engine */
export interface LiveSources {
    memories(): LivePlayback[];
    masters(): Record<GridMaster, number>;
    groups(): Record<string, number>;
    audio(): { id: string; file: string; position: number; volume: number; paused: boolean } | null;
    programs(): Record<string, LayerState[]>;
}

// Least change of a level that adds a point, and longest time between points of a moving level
const LEVEL_STEP = 0.01;
const POINT_TIME = 0.5;
// Shortest recorded clip, in seconds
const MIN_CLIP = 0.05;

/** Clip being recorded */
interface OpenClip {
    kind: 'light' | 'audio' | 'video';
    start: number;
    offset: number;
    fadeIn: number;
    source: ClipSource;
    /** Video clips: the track of their output and layer */
    track: string | null;
}

/** Clip recorded, waiting for its track */
interface DoneClip {
    kind: 'light' | 'audio' | 'video';
    clip: Clip;
    track: string | null;
}

/** Curve being written on an automation track */
interface Curve {
    points: AutomationPoint[];
    last: number;
}

export class TimelineRecorder {
    private readonly sources: LiveSources;
    private readonly newId: () => string;
    private active = false;
    private tracks: Track[] = [];
    private readonly open = new Map<string, OpenClip>();
    private readonly done: DoneClip[] = [];
    private readonly curves = new Map<string, Curve>();
    /** State at the tick before */
    private memories = new Set<string>();
    /** Fade out of the memories on at the tick before, used when they are turned off */
    private fadeOuts = new Map<string, number>();
    private levels = new Map<string, number>();
    private voice: string | null = null;
    private layers = new Map<string, string>();

    constructor(sources: LiveSources, newId: () => string) {
        this.sources = sources;
        this.newId = newId;
    }

    /** A pass is being recorded */
    get recording(): boolean {
        return this.active;
    }

    /**
     * Starts a pass on the armed tracks of a timeline; nothing happens
     * without armed tracks.
     */
    start(timeline: Timeline): void {
        this.reset();
        this.tracks = timeline.tracks.filter((track) => track.armed && track.kind !== 'folder');
        if (this.tracks.length === 0) {
            return;
        }
        this.active = true;
        this.memories = new Set(this.sources.memories().map((memory) => memory.key));
        for (const track of this.automationTracks()) {
            this.levels.set(track.id, this.level(track.target));
        }
        const audio = this.sources.audio();
        this.voice = audio !== null && !audio.paused ? audio.id : null;
        for (const track of this.videoTracks()) {
            this.layers.set(track.id, this.layerKey(track));
        }
    }

    /**
     * Compares what is live with the tick before.
     * @param position - Playhead position, in seconds
     */
    tick(position: number): void {
        if (!this.active) {
            return;
        }
        this.recordMemories(position);
        this.recordLevels(position);
        this.recordAudio(position);
        this.recordVideo(position);
    }

    /**
     * Ends the pass: open clips end at the position, and the recorded clips
     * and curves are added to a copy of the timeline.
     * @returns the timeline with the recording, null when nothing was recorded
     */
    finish(timeline: Timeline, position: number): Timeline | null {
        if (!this.active) {
            return null;
        }
        for (const key of [...this.open.keys()]) {
            this.close(key, position, 0);
        }
        const result = this.apply(timeline, position);
        this.reset();
        return result;
    }

    private reset(): void {
        this.active = false;
        this.tracks = [];
        this.open.clear();
        this.done.length = 0;
        this.curves.clear();
        this.memories = new Set();
        this.fadeOuts = new Map();
        this.levels = new Map();
        this.voice = null;
        this.layers = new Map();
    }

    private automationTracks(): Track[] {
        return this.tracks.filter((track) => track.kind === 'automation' && track.target !== null);
    }

    private videoTracks(): Track[] {
        return this.tracks.filter((track) => track.kind === 'video' && track.output !== '');
    }

    private hasTracks(kind: Track['kind']): boolean {
        return this.tracks.some((track) => track.kind === kind);
    }

    /** Level of an automation target now */
    private level(target: AutomationTarget | null): number {
        if (target === null) {
            return 0;
        }
        switch (target.kind) {
            case 'master': return this.sources.masters()[target.master] ?? 0;
            case 'group': return this.sources.groups()[target.id] ?? 0;
            case 'scene': {
                const memory = this.sources.memories().find((item) => item.kind === 'scene' && item.id === target.id);
                return memory === undefined ? 0 : memory.manual ?? 1;
            }
        }
    }

    private layerKey(track: Track): string {
        return JSON.stringify(this.sources.programs()[track.output]?.[track.layer] ?? null);
    }

    private recordMemories(position: number): void {
        if (!this.hasTracks('light')) {
            return;
        }
        // A scene written as a level on an armed automation track is not a clip too
        const levelled = new Set(this.automationTracks().flatMap((track) => track.target?.kind === 'scene' ? [track.target.id] : []));
        const live = this.sources.memories();
        const now = new Set(live.map((memory) => memory.key));
        for (const memory of live) {
            if (!this.memories.has(memory.key) && !this.open.has(memory.key) && !(memory.kind === 'scene' && levelled.has(memory.id))) {
                this.open.set(memory.key, { kind: 'light', start: position, offset: 0, fadeIn: memory.fadeIn, source: { kind: memory.kind, id: memory.id }, track: null });
            }
        }
        for (const key of [...this.open.keys()]) {
            if (this.open.get(key)?.kind === 'light' && !now.has(key)) {
                // The clip lasts until the end of the fade out
                const fadeOut = this.fadeOuts.get(key) ?? 0;
                this.close(key, position + fadeOut, fadeOut);
            }
        }
        this.memories = now;
        this.fadeOuts = new Map(live.map((memory) => [memory.key, memory.fadeOut]));
    }

    private recordLevels(position: number): void {
        for (const track of this.automationTracks()) {
            const value = this.level(track.target);
            const before = this.levels.get(track.id) ?? value;
            let curve = this.curves.get(track.id);
            if (curve === undefined) {
                if (Math.abs(value - before) < 0.001) {
                    continue;
                }
                // The curve starts from the level before the movement
                curve = { points: [[position, before]], last: before };
                this.curves.set(track.id, curve);
            }
            const lastPoint = curve.points[curve.points.length - 1];
            if (Math.abs(value - lastPoint[1]) >= LEVEL_STEP || (value !== lastPoint[1] && position - lastPoint[0] >= POINT_TIME)) {
                curve.points.push([position, value]);
            }
            curve.last = value;
            this.levels.set(track.id, value);
        }
    }

    private recordAudio(position: number): void {
        if (!this.hasTracks('audio')) {
            return;
        }
        const audio = this.sources.audio();
        const playing = audio !== null && !audio.paused ? audio : null;
        const key = 'audio';
        const open = this.open.get(key);
        if (open !== undefined && (playing === null || this.voice !== playing.id)) {
            this.close(key, position, 0);
        }
        if (playing !== null && this.voice !== playing.id) {
            this.open.set(key, { kind: 'audio', start: position, offset: playing.position, fadeIn: 0, source: { kind: 'audio', file: playing.file, volume: playing.volume }, track: null });
        }
        this.voice = playing?.id ?? null;
    }

    private recordVideo(position: number): void {
        const programs = this.sources.programs();
        for (const track of this.videoTracks()) {
            const layer = programs[track.output]?.[track.layer] ?? null;
            const now = JSON.stringify(layer);
            if (now === this.layers.get(track.id)) {
                continue;
            }
            this.layers.set(track.id, now);
            const key = `video:${track.id}`;
            if (this.open.has(key)) {
                this.close(key, position, 0);
            }
            if (layer !== null && layer.source !== null) {
                this.open.set(key, { kind: 'video', start: position, offset: 0, fadeIn: 0, source: { kind: 'layer', layer: structuredClone(layer) }, track: track.id });
            }
        }
    }

    /**
     * Ends an open clip.
     * @param end - End of the clip on the timeline, in seconds
     */
    private close(key: string, end: number, fadeOut: number): void {
        const open = this.open.get(key);
        this.open.delete(key);
        if (open === undefined) {
            return;
        }
        const duration = Math.max(MIN_CLIP, end - open.start);
        const fadeIn = Math.min(open.fadeIn, duration);
        this.done.push({
            kind: open.kind,
            track: open.track,
            clip: {
                id: this.newId(),
                start: open.start,
                duration,
                offset: open.offset,
                fadeIn,
                fadeOut: Math.min(fadeOut, duration - fadeIn),
                name: '',
                source: open.source
            }
        });
    }

    /**
     * Adds the recording to a copy of the timeline: light and audio clips go
     * to the first armed track of their kind where they do not overlap other
     * clips (the first one otherwise), video clips to the track of their
     * layer; curves replace the points of their track in the recorded time.
     */
    private apply(timeline: Timeline, position: number): Timeline | null {
        if (this.done.length === 0 && this.curves.size === 0) {
            return null;
        }
        const next = structuredClone(timeline);
        const armed = (kind: Track['kind']): Track[] => this.tracks
            .filter((track) => track.kind === kind)
            .map((track) => next.tracks.find((item) => item.id === track.id))
            .filter((track): track is Track => track !== undefined);
        const overlaps = (track: Track, clip: Clip): boolean => track.clips.some((other) => other.start < clip.start + clip.duration && clip.start < other.start + other.duration);
        let clips = next.tracks.reduce((count, track) => count + track.clips.length, 0);
        for (const item of this.done.sort((a, b) => a.clip.start - b.clip.start)) {
            if (clips >= TIMELINE_LIMITS.clips) {
                break;
            }
            let target: Track | undefined;
            if (item.kind === 'video') {
                target = next.tracks.find((track) => track.id === item.track);
            } else {
                const candidates = armed(item.kind);
                target = candidates.find((track) => !overlaps(track, item.clip)) ?? candidates[0];
            }
            if (target !== undefined) {
                target.clips.push(item.clip);
                target.clips.sort((a, b) => a.start - b.start);
                next.length = Math.min(TIMELINE_LIMITS.length, Math.max(next.length, item.clip.start + item.clip.duration));
                clips++;
            }
        }
        for (const [id, curve] of this.curves) {
            const track = next.tracks.find((item) => item.id === id);
            if (track === undefined) {
                continue;
            }
            const points = [...curve.points];
            if (points[points.length - 1][0] < position) {
                points.push([position, curve.last]);
            }
            const from = points[0][0];
            const to = points[points.length - 1][0];
            track.points = [...track.points.filter(([time]) => time < from || time > to), ...points].sort((a, b) => a[0] - b[0]).slice(0, 5000);
        }
        return next;
    }
}
