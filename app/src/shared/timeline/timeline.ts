/**
 * Timelines of a show (Phase 8): pre-programmed sequences of lights,
 * audio, video and automation on tracks, like an audio workstation. A show
 * has several timelines (decided by the human), each with its tempo and
 * meter, so the ruler shows bars and time. Tracks are free: added, removed,
 * moved and grouped in folders. Saved in show.json under "timelines".
 * Times are in seconds. Shared between engine and interface.
 */

import type { GridMaster } from '../grid/grid.js';
import { normalizeLayer, type LayerState } from '../video/video.js';

/** Kind of track */
export type TrackKind = 'light' | 'audio' | 'video' | 'automation' | 'mixer' | 'folder';
export const TRACK_KINDS: readonly TrackKind[] = ['light', 'audio', 'video', 'automation', 'mixer', 'folder'];

/** What a clip plays, by kind of track */
export type ClipSource =
    | { kind: 'scene'; id: string }
    | { kind: 'chaser'; id: string }
    | { kind: 'audio'; file: string; volume: number }
    | { kind: 'layer'; layer: LayerState }
    | { kind: 'mixer'; number: number };

/** Clip on a track */
export interface Clip {
    id: string;
    /** Start on the timeline and length, in seconds */
    start: number;
    duration: number;
    /** Time skipped at the beginning of the source (audio and video files) */
    offset: number;
    fadeIn: number;
    fadeOut: number;
    /** Text on the clip, empty for the name of its source */
    name: string;
    source: ClipSource;
}

/** What an automation track changes */
export type AutomationTarget =
    | { kind: 'master'; master: GridMaster }
    | { kind: 'group'; id: string }
    | { kind: 'scene'; id: string };

/** Point of an automation curve: time in seconds, value 0 to 1 */
export type AutomationPoint = [number, number];

/** Track of a timeline */
export interface Track {
    id: string;
    name: string;
    kind: TrackKind;
    /** Folder holding the track, null at the top level */
    parent: string | null;
    /** A folder hides its tracks */
    collapsed: boolean;
    muted: boolean;
    /** Armed: live actions are recorded on the track while the timeline records */
    armed: boolean;
    /** Height of the track in the editor, in pixels (multiple of 8) */
    height: number;
    clips: Clip[];
    /** Audio tracks: output device (empty for the system output) and volume */
    device: string;
    volume: number;
    /** Video tracks: output and layer (from 0) */
    output: string;
    layer: number;
    /** Mixer tracks: the external mixer whose scenes the clips recall, at their start */
    mixer: string;
    /** Automation tracks: target and curve */
    target: AutomationTarget | null;
    points: AutomationPoint[];
}

/** Marker on the ruler; a stop marker pauses playback in go mode */
export interface Marker {
    id: string;
    time: number;
    name: string;
    stop: boolean;
}

/** Timeline */
export interface Timeline {
    id: string;
    name: string;
    /** Tempo and meter: beats per bar */
    bpm: number;
    beatsPerBar: number;
    /** Length in seconds */
    length: number;
    tracks: Track[];
    markers: Marker[];
}

/** Timelines section of show.json */
export interface ShowTimelines {
    timelines: Timeline[];
}

export const EMPTY_TIMELINES: ShowTimelines = { timelines: [] };

/** Limits */
export const TIMELINE_LIMITS = { timelines: 100, tracks: 128, clips: 2000, length: 4 * 3600, bpm: { min: 20, max: 300 } } as const;

/** Height of a new track, and limits */
export const TRACK_HEIGHT = { default: 64, min: 32, max: 256 } as const;

/** Kinds of clip accepted by each kind of track */
export const TRACK_SOURCES: Readonly<Record<TrackKind, readonly ClipSource['kind'][]>> = {
    light: ['scene', 'chaser'],
    audio: ['audio'],
    video: ['layer'],
    automation: [],
    mixer: ['mixer'],
    folder: []
};

/** New track */
export function newTrack(id: string, kind: TrackKind, name: string): Track {
    return {
        id, name, kind, parent: null, collapsed: false, muted: false, armed: false, height: TRACK_HEIGHT.default, clips: [],
        device: '', volume: 1, output: '', layer: 0, mixer: '', target: null, points: []
    };
}

/** New timeline */
export function newTimeline(id: string, name: string): Timeline {
    return { id, name, bpm: 120, beatsPerBar: 4, length: 180, tracks: [], markers: [] };
}

/** Length of one beat, in seconds */
export function beatLength(timeline: Pick<Timeline, 'bpm'>): number {
    return 60 / timeline.bpm;
}

/**
 * Bar, beat and sixteenth of a time, from 1, as on the display: "34.2.1".
 */
export function barPosition(timeline: Pick<Timeline, 'bpm' | 'beatsPerBar'>, time: number): string {
    const beats = Math.max(0, time) / beatLength(timeline);
    const bar = Math.floor(beats / timeline.beatsPerBar) + 1;
    const beat = Math.floor(beats % timeline.beatsPerBar) + 1;
    const sixteenth = Math.floor((beats % 1) * 4) + 1;
    return `${bar}.${beat}.${sixteenth}`;
}

/**
 * Value of an automation curve at a time: straight lines between the points,
 * the first or last value outside them; null without points.
 */
export function curveValue(points: readonly AutomationPoint[], time: number): number | null {
    if (points.length === 0) {
        return null;
    }
    if (time <= points[0][0]) {
        return points[0][1];
    }
    for (let index = 1; index < points.length; index++) {
        const [t1, v1] = points[index];
        if (time <= t1) {
            const [t0, v0] = points[index - 1];
            return t1 === t0 ? v1 : v0 + ((v1 - v0) * (time - t0)) / (t1 - t0);
        }
    }
    return points[points.length - 1][1];
}

/**
 * Level of a clip at a time on the timeline, with its fades; 0 outside.
 */
export function clipLevel(clip: Pick<Clip, 'start' | 'duration' | 'fadeIn' | 'fadeOut'>, time: number): number {
    const inside = time - clip.start;
    if (inside < 0 || inside >= clip.duration) {
        return 0;
    }
    const fadeIn = clip.fadeIn > 0 ? Math.min(1, inside / clip.fadeIn) : 1;
    const fadeOut = clip.fadeOut > 0 ? Math.min(1, (clip.duration - inside) / clip.fadeOut) : 1;
    return Math.min(fadeIn, fadeOut);
}

// Reading of the file

const num = (value: unknown, min: number, max: number, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const text = (value: unknown, max: number, fallback = ''): string => typeof value === 'string' ? value.slice(0, max) : fallback;

function readSource(value: unknown): ClipSource | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
    switch (input.kind) {
        case 'scene':
        case 'chaser':
            return typeof input.id === 'string' && input.id !== '' ? { kind: input.kind, id: input.id } : null;
        case 'audio':
            return typeof input.file === 'string' && input.file !== '' ? { kind: 'audio', file: input.file, volume: num(input.volume, 0, 1, 1) } : null;
        case 'layer': {
            const layer = normalizeLayer(input.layer);
            return layer.source === null ? null : { kind: 'layer', layer };
        }
        case 'mixer':
            return { kind: 'mixer', number: Math.round(num(input.number, 0, 9999, 0)) };
        default:
            return null;
    }
}

function readTarget(value: unknown): AutomationTarget | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
    if (input.kind === 'master' && ['a', 'b', 'scene', 'grand'].includes(input.master as string)) {
        return { kind: 'master', master: input.master as GridMaster };
    }
    if ((input.kind === 'group' || input.kind === 'scene') && typeof input.id === 'string' && input.id !== '') {
        return { kind: input.kind, id: input.id };
    }
    return null;
}

function readTrack(value: unknown, ids: Set<string>, count: { clips: number }): Track | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof Track, unknown>>;
    if (typeof input.id !== 'string' || input.id === '' || ids.has(input.id) || !TRACK_KINDS.includes(input.kind as TrackKind)) {
        return null;
    }
    ids.add(input.id);
    const kind = input.kind as TrackKind;
    const track = newTrack(input.id, kind, text(input.name, 60, 'Track'));
    track.parent = typeof input.parent === 'string' && input.parent !== '' ? input.parent : null;
    track.collapsed = input.collapsed === true;
    track.muted = input.muted === true;
    track.armed = kind !== 'folder' && input.armed === true;
    track.height = Math.round(num(input.height, TRACK_HEIGHT.min, TRACK_HEIGHT.max, TRACK_HEIGHT.default) / 8) * 8;
    track.device = text(input.device, 300);
    track.volume = num(input.volume, 0, 1, 1);
    track.output = text(input.output, 100);
    track.layer = Math.round(num(input.layer, 0, 7, 0));
    track.mixer = kind === 'mixer' ? text(input.mixer, 100) : '';
    track.target = kind === 'automation' ? readTarget(input.target) : null;
    if (kind === 'automation' && Array.isArray(input.points)) {
        track.points = input.points
            .filter((point): point is [number, number] => Array.isArray(point) && typeof point[0] === 'number' && typeof point[1] === 'number')
            .map(([time, level]) => [num(time, 0, TIMELINE_LIMITS.length, 0), num(level, 0, 1, 0)] as AutomationPoint)
            .sort((a, b) => a[0] - b[0])
            .slice(0, 5000);
    }
    for (const raw of Array.isArray(input.clips) ? input.clips : []) {
        const clip = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof Clip, unknown>>;
        const source = readSource(clip.source);
        if (typeof clip.id !== 'string' || clip.id === '' || ids.has(clip.id) || source === null
            || !TRACK_SOURCES[kind].includes(source.kind) || count.clips >= TIMELINE_LIMITS.clips) {
            continue;
        }
        ids.add(clip.id);
        count.clips++;
        const duration = num(clip.duration, 0.05, TIMELINE_LIMITS.length, 4);
        track.clips.push({
            id: clip.id,
            start: num(clip.start, 0, TIMELINE_LIMITS.length, 0),
            duration,
            offset: num(clip.offset, 0, 24 * 3600, 0),
            fadeIn: num(clip.fadeIn, 0, duration, 0),
            fadeOut: num(clip.fadeOut, 0, duration, 0),
            name: text(clip.name, 60),
            source
        });
    }
    track.clips.sort((a, b) => a.start - b.start);
    return track;
}

/**
 * Reads one timeline; null when it has no identifier.
 * @param ids - Identifiers already used, filled with the ones of the timeline
 */
export function normalizeTimeline(value: unknown, ids: Set<string> = new Set()): Timeline | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof Timeline, unknown>>;
    if (typeof input.id !== 'string' || input.id === '' || ids.has(input.id)) {
        return null;
    }
    ids.add(input.id);
    const timeline = newTimeline(input.id, text(input.name, 60, 'Timeline'));
    timeline.bpm = num(input.bpm, TIMELINE_LIMITS.bpm.min, TIMELINE_LIMITS.bpm.max, 120);
    timeline.beatsPerBar = Math.round(num(input.beatsPerBar, 1, 16, 4));
    timeline.length = num(input.length, 1, TIMELINE_LIMITS.length, 180);
    const count = { clips: 0 };
    for (const raw of Array.isArray(input.tracks) ? input.tracks.slice(0, TIMELINE_LIMITS.tracks) : []) {
        const track = readTrack(raw, ids, count);
        if (track !== null) {
            timeline.tracks.push(track);
        }
    }
    // A track can only be inside a folder of the same timeline
    const folders = new Set(timeline.tracks.filter((track) => track.kind === 'folder').map((track) => track.id));
    timeline.tracks.forEach((track) => {
        if (track.parent !== null && (!folders.has(track.parent) || track.parent === track.id)) {
            track.parent = null;
        }
    });
    for (const raw of Array.isArray(input.markers) ? input.markers.slice(0, 1000) : []) {
        const marker = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof Marker, unknown>>;
        if (typeof marker.id === 'string' && marker.id !== '' && !ids.has(marker.id)) {
            ids.add(marker.id);
            timeline.markers.push({ id: marker.id, time: num(marker.time, 0, TIMELINE_LIMITS.length, 0), name: text(marker.name, 60), stop: marker.stop === true });
        }
    }
    timeline.markers.sort((a, b) => a.time - b.time);
    return timeline;
}

/**
 * Reads the timelines of a file.
 */
export function normalizeTimelines(value: unknown): ShowTimelines {
    const input = (typeof value === 'object' && value !== null ? value : {}) as { timelines?: unknown };
    const ids = new Set<string>();
    const timelines: Timeline[] = [];
    for (const raw of Array.isArray(input.timelines) ? input.timelines.slice(0, TIMELINE_LIMITS.timelines) : []) {
        const timeline = normalizeTimeline(raw, ids);
        if (timeline !== null) {
            timelines.push(timeline);
        }
    }
    return { timelines };
}

/** Transport state of the timeline player */
export interface TimelineState {
    /** Timeline loaded in the player, null for none */
    timeline: string | null;
    playing: boolean;
    /** Position in seconds at sentAt (wall clock, milliseconds) */
    position: number;
    sentAt: number;
    /** Loop between two times, null for none */
    loop: { start: number; end: number } | null;
    /** Live actions become clips while playing */
    recording: boolean;
    /** Go mode: playback pauses at the stop markers */
    goMode: boolean;
}
