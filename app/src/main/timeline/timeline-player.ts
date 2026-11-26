/**
 * Player of the timelines: the shared clock of light, audio and video
 * (Phase 8.5). One timeline is loaded at a time; while it plays, at every
 * tick the light clips set the level of their scene or chaser, the audio
 * clips play on their tracks, the video clips take their layer, and the
 * automation curves set masters, groups and scenes. Loop, go mode (pause
 * at the stop markers) and the end of the timeline are handled here.
 */

import { clipLevel, curveValue, type Clip, type ShowTimelines, type Timeline, type TimelineState, type Track } from '../../shared/timeline/timeline';
import type { GridMaster } from '../../shared/grid/grid';
import type { LayerState } from '../../shared/video/video';
import type { MemoryPlayer } from '../console/memory-player';
import type { VideoEngine } from '../video/video-engine';
import type { TimelineAudio } from './timeline-audio';

/** Where the automation curves send their values */
export interface AutomationSink {
    master(master: GridMaster, level: number): void;
    group(id: string, level: number): void;
    scene(id: string, level: number): void;
}

/** What the player needs from the rest of the engine */
export interface TimelinePlayerContext {
    timelines: () => ShowTimelines | null;
    memory: MemoryPlayer;
    video: VideoEngine;
    audio: TimelineAudio;
    automation: AutomationSink;
    onState: (state: TimelineState) => void;
}

const TICK_MS = 25;

export class TimelinePlayer {
    private readonly context: TimelinePlayerContext;
    private timelineId: string | null = null;
    private playing = false;
    /** Position when playback started, and the clock time of the start */
    private basePosition = 0;
    private startedAt = 0;
    private lastPosition = 0;
    private loop: { start: number; end: number } | null = null;
    private recording = false;
    private goMode = false;
    private timer: NodeJS.Timeout | null = null;
    private readonly lightClips = new Set<string>();
    private readonly videoTracks = new Map<string, string>();
    private readonly automation = new Map<string, number>();

    constructor(context: TimelinePlayerContext) {
        this.context = context;
    }

    state(): TimelineState {
        return {
            timeline: this.timelineId,
            playing: this.playing,
            position: this.position(),
            sentAt: Date.now(),
            loop: this.loop,
            recording: this.recording,
            goMode: this.goMode
        };
    }

    /** Timeline loaded */
    current(): Timeline | null {
        return this.context.timelines()?.timelines.find((timeline) => timeline.id === this.timelineId) ?? null;
    }

    /** Scene or chaser played by a light clip of the loaded timeline */
    clipTarget(id: string): { kind: 'scene' | 'chaser'; id: string } | null {
        for (const track of this.current()?.tracks ?? []) {
            const clip = track.clips.find((item) => item.id === id);
            if (clip !== undefined && (clip.source.kind === 'scene' || clip.source.kind === 'chaser')) {
                return { kind: clip.source.kind, id: clip.source.id };
            }
        }
        return null;
    }

    /**
     * Loads a timeline, stopped at its start.
     */
    load(id: string | null): void {
        this.stop();
        this.timelineId = id;
        this.basePosition = 0;
        this.lastPosition = 0;
        this.loop = null;
        this.announce();
    }

    play(): void {
        const timeline = this.current();
        if (timeline === null || this.playing) {
            return;
        }
        if (this.basePosition >= timeline.length) {
            this.basePosition = 0;
        }
        this.playing = true;
        this.startedAt = performance.now();
        this.lastPosition = this.basePosition;
        this.context.audio.applyOutputs(timeline, (track) => this.muted(timeline, track));
        this.timer = setInterval(() => this.tick(), TICK_MS);
        this.apply(this.basePosition, true);
        this.announce();
    }

    /** Pauses at the current position: lights and video stay as they are */
    pause(): void {
        if (!this.playing) {
            return;
        }
        this.basePosition = this.position();
        this.playing = false;
        this.stopTimer();
        this.context.audio.stopAll();
        this.announce();
    }

    toggle(): void {
        if (this.playing) {
            this.pause();
        } else {
            this.play();
        }
    }

    /** Stops and goes back to the start: the clips of the timeline leave the outputs */
    stop(): void {
        this.playing = false;
        this.stopTimer();
        this.basePosition = 0;
        this.lastPosition = 0;
        this.release();
        this.announce();
    }

    /**
     * Moves the playhead; playback goes on from there.
     */
    locate(time: number): void {
        const timeline = this.current();
        const position = Math.max(0, Math.min(timeline?.length ?? 0, time));
        this.context.audio.stopAll();
        this.basePosition = position;
        this.startedAt = performance.now();
        this.lastPosition = position;
        if (this.playing) {
            this.apply(position, true);
        }
        this.announce();
    }

    setLoop(loop: { start: number; end: number } | null): void {
        this.loop = loop !== null && loop.end > loop.start ? loop : null;
        this.announce();
    }

    setGoMode(on: boolean): void {
        this.goMode = on;
        this.announce();
    }

    setRecording(on: boolean): void {
        this.recording = on;
        this.announce();
    }

    /**
     * Follows a change of the timelines: a deleted timeline is unloaded, the
     * outputs of the audio tracks are applied again.
     */
    timelinesChanged(): void {
        const timeline = this.current();
        if (timeline === null && this.timelineId !== null) {
            this.load(null);
            return;
        }
        if (timeline !== null && this.playing) {
            this.context.audio.applyOutputs(timeline, (track) => this.muted(timeline, track));
            this.apply(this.position(), false);
        }
    }

    /** Position of the playhead, in seconds */
    position(): number {
        return this.playing ? this.basePosition + (performance.now() - this.startedAt) / 1000 : this.basePosition;
    }

    private tick(): void {
        const timeline = this.current();
        if (timeline === null) {
            this.stop();
            return;
        }
        let position = this.position();
        if (this.loop !== null && position >= this.loop.end) {
            this.locate(this.loop.start);
            return;
        }
        if (this.goMode) {
            const marker = timeline.markers.find((item) => item.stop && item.time > this.lastPosition && item.time <= position);
            if (marker !== undefined) {
                this.basePosition = marker.time;
                this.pause();
                return;
            }
        }
        if (position >= timeline.length) {
            position = timeline.length;
            this.apply(position, false);
            this.basePosition = position;
            this.playing = false;
            this.stopTimer();
            this.context.audio.stopAll();
            this.announce();
            return;
        }
        this.lastPosition = position;
        this.apply(position, false);
    }

    /** A track is silent when it or one of its folders is muted */
    private muted(timeline: Timeline, track: Track): boolean {
        let current: Track | undefined = track;
        const seen = new Set<string>();
        while (current !== undefined && !seen.has(current.id)) {
            if (current.muted) {
                return true;
            }
            seen.add(current.id);
            current = current.parent === null ? undefined : timeline.tracks.find((item) => item.id === current?.parent);
        }
        return false;
    }

    /**
     * Applies the timeline at a position.
     * @param jumped - The playhead moved: audio clips start from their right point
     */
    private apply(position: number, jumped: boolean): void {
        const timeline = this.current();
        if (timeline === null) {
            return;
        }
        const lights = new Set<string>();
        const audio = new Set<string>();
        const videoTracks = new Set<string>();
        for (const track of timeline.tracks) {
            if (track.kind === 'folder' || this.muted(timeline, track)) {
                continue;
            }
            if (track.kind === 'automation') {
                this.applyAutomation(track, position);
                continue;
            }
            const active = track.clips.filter((clip) => clipLevel(clip, position) > 0 || (clip.fadeIn === 0 && position >= clip.start && position < clip.start + clip.duration));
            if (track.kind === 'light') {
                for (const clip of active) {
                    lights.add(clip.id);
                    this.context.memory.setClipLevel(clip.id, Math.max(0.0001, clipLevel(clip, position)));
                }
            } else if (track.kind === 'audio') {
                for (const clip of active) {
                    audio.add(clip.id);
                    if (!this.context.audio.has(clip.id) || jumped) {
                        if (jumped) {
                            this.context.audio.stop(clip.id);
                        }
                        this.context.audio.start(track, clip, position);
                    }
                }
            } else if (track.kind === 'video') {
                const clip: Clip | undefined = active[active.length - 1];
                if (clip !== undefined && clip.source.kind === 'layer') {
                    videoTracks.add(track.id);
                    const layer: LayerState = { ...clip.source.layer, opacity: clip.source.layer.opacity * clipLevel(clip, position) };
                    this.context.video.setTimelineLayer(track.output, track.layer, layer);
                    this.videoTracks.set(track.id, `${track.output}:${track.layer}`);
                }
            }
        }
        for (const id of [...this.lightClips]) {
            if (!lights.has(id)) {
                this.context.memory.setClipLevel(id, 0);
            }
        }
        this.lightClips.clear();
        lights.forEach((id) => this.lightClips.add(id));
        for (const id of this.context.audio.playing()) {
            if (!audio.has(id)) {
                this.context.audio.stop(id);
            }
        }
        for (const [trackId, place] of [...this.videoTracks]) {
            if (!videoTracks.has(trackId)) {
                const [output, layer] = place.split(':');
                this.context.video.setTimelineLayer(output, Number(layer), null);
                this.videoTracks.delete(trackId);
            }
        }
    }

    private applyAutomation(track: Track, position: number): void {
        const value = curveValue(track.points, position);
        const target = track.target;
        if (value === null || target === null) {
            return;
        }
        const last = this.automation.get(track.id);
        if (last !== undefined && Math.abs(last - value) < 0.002) {
            return;
        }
        this.automation.set(track.id, value);
        if (target.kind === 'master') {
            this.context.automation.master(target.master, value);
        } else if (target.kind === 'group') {
            this.context.automation.group(target.id, value);
        } else {
            this.context.automation.scene(target.id, value);
        }
    }

    /** Takes every clip of the timeline off the outputs */
    private release(): void {
        for (const id of this.lightClips) {
            this.context.memory.setClipLevel(id, 0);
        }
        this.lightClips.clear();
        this.context.audio.stopAll();
        for (const place of this.videoTracks.values()) {
            const [output, layer] = place.split(':');
            this.context.video.setTimelineLayer(output, Number(layer), null);
        }
        this.videoTracks.clear();
        this.automation.clear();
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
