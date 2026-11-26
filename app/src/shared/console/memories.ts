/**
 * Memories of the simple console: scenes, chasers and the cue list, saved
 * in show.json under "memories". Scenes live in two banks of 12 places,
 * chasers in one bank of 12 (decided by the human). A scene stores DMX
 * levels recorded from the desk, with its own fade times; a chaser plays
 * scenes in steps, referencing them, at its own speed; the cue list plays
 * scenes in order with Go and Back. Shared between engine and interface.
 */

import { UNIVERSE_SIZE } from '../fixtures/fixture-definition.js';
import { normalizeMatrixEffects, type MatrixEffect } from '../patch/matrix-effect.js';
import { MAX_UNIVERSE } from '../patch/patch.js';
import { normalizeLayers, type LayerState } from '../video/video.js';
import { FADE_LIMITS } from '../show/show-settings.js';

/** Memory places in a bank */
export const MEMORIES_PER_BANK = 12;

/** Banks of scenes and of chasers */
export const SCENE_BANKS = 2;
export const CHASER_BANKS = 1;

/** Places of scenes and of chasers, numbered from 1 */
export const SCENE_SLOTS = SCENE_BANKS * MEMORIES_PER_BANK;
export const CHASER_SLOTS = CHASER_BANKS * MEMORIES_PER_BANK;

/** Limits of the chaser speed, in beats per minute (one step per beat) */
export const BPM_LIMITS = { min: 1, max: 600 } as const;

/** Default speed of a new chaser */
export const DEFAULT_BPM = 120;

/** Most steps in a chaser */
export const MAX_CHASER_STEPS = 256;

/** Most cues in the cue list */
export const MAX_CUES = 999;

/** Limits of the cue numbers; one decimal digit, to insert cues between others */
export const CUE_NUMBER_LIMITS = { min: 0.1, max: 9999.9 } as const;

/** Longest note of a cue */
export const CUE_NOTE_MAX_LENGTH = 200;

/** Longest name of a memory */
export const MEMORY_NAME_MAX_LENGTH = 60;

/** Kind of memory played by the memory keys */
export type MemoryKind = 'scene' | 'chaser';

/** Order of the steps of a chaser */
export type ChaserDirection = 'loop' | 'bounce' | 'random' | 'oneShot';

/** Directions in presentation order */
export const CHASER_DIRECTIONS: readonly ChaserDirection[] = ['loop', 'bounce', 'random', 'oneShot'];

/** Levels of a universe, as pairs of DMX channel (1 to 512) and value (0 to 255) */
export interface UniverseLevels {
    universe: number;
    channels: Array<[number, number]>;
}

/** Scene: recorded levels with their fade times */
export interface Scene {
    id: string;
    /** Place, 1 to SCENE_SLOTS */
    slot: number;
    name: string;
    /** Fade in and fade out, in seconds */
    fadeIn: number;
    fadeOut: number;
    levels: UniverseLevels[];
    /** Effects of the LED matrices: matrix identifier -> effect; missing in older files */
    matrices: Record<string, MatrixEffect>;
    /** Item of the audio playlist started by the scene, null for none; missing in older files */
    audio: string | null;
    /** Program of the video outputs that had something on: output identifier -> layers; missing in older files */
    video: Record<string, LayerState[]>;
}

/** Chaser: scenes played one after the other */
export interface Chaser {
    id: string;
    /** Place, 1 to CHASER_SLOTS */
    slot: number;
    name: string;
    /** Identifiers of the scenes, one per step; a scene can be used more than once */
    steps: string[];
    /** Speed: steps per minute */
    bpm: number;
    /** Crossfade between steps, as a part of the step time, 0 to 1 */
    fade: number;
    direction: ChaserDirection;
}

/** Cue of the cue list: a scene played with Go */
export interface Cue {
    id: string;
    /** Number shown to the operator, unique, with one decimal digit; the list is in number order */
    number: number;
    /** Identifier of the scene */
    scene: string;
    note: string;
    /** Fade in and fade out in seconds; null to use the times of the scene */
    fadeIn: number | null;
    fadeOut: number | null;
    /** Seconds after the Go of this cue when the next cue goes by itself; null for manual */
    follow: number | null;
}

/** Memories section of show.json */
export interface ShowMemories {
    scenes: Scene[];
    chasers: Chaser[];
    /** Cue list, in number order */
    cues: Cue[];
}

/** Memories of a new show */
export const EMPTY_MEMORIES: ShowMemories = { scenes: [], chasers: [], cues: [] };

/** Scene without its levels and effects, as the interface lists it */
export interface SceneSummary extends Omit<Scene, 'levels' | 'matrices' | 'video'> {
    /** Channels recorded, on all the universes */
    channelCount: number;
    /** Matrix effects recorded */
    effectCount: number;
}

/** Memories as the interface lists them */
export interface MemoriesSummary {
    scenes: SceneSummary[];
    chasers: Chaser[];
    cues: Cue[];
}

/** A memory being played */
export interface MemoryPlayback {
    kind: MemoryKind;
    id: string;
    /** Step being played, for chasers: index in the steps */
    step: number | null;
    /** Level set by a fader of the grid, null when the memory follows its fades */
    level: number | null;
}

/** Playback state of the memories */
export interface MemoriesState {
    /** Memories on, in order of activation; memories fading out are not listed */
    active: MemoryPlayback[];
    /** Chaser that the tempo controls act on: the last one turned on or edited */
    selectedChaser: string | null;
}

/**
 * Summary of a scene, without its levels.
 */
export function sceneSummary(scene: Scene): SceneSummary {
    const { levels, matrices, video, ...rest } = scene;
    return { ...rest, channelCount: levels.reduce((count, item) => count + item.channels.length, 0), effectCount: Object.keys(matrices).length };
}

function isInteger(value: unknown, min: number, max: number): value is number {
    return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function readName(value: unknown): string | null {
    return typeof value === 'string' ? value.slice(0, MEMORY_NAME_MAX_LENGTH) : null;
}

function readVideo(value: unknown): Record<string, LayerState[]> {
    const result: Record<string, LayerState[]> = {};
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return result;
    }
    for (const [id, layers] of Object.entries(value)) {
        if (id !== '' && Array.isArray(layers)) {
            result[id] = normalizeLayers(layers, Math.min(layers.length, 8));
        }
    }
    return result;
}

function readLevels(value: unknown): UniverseLevels[] {
    const result: UniverseLevels[] = [];
    const universes = new Set<number>();
    for (const item of Array.isArray(value) ? value : []) {
        const entry = (typeof item === 'object' && item !== null ? item : {}) as { universe?: unknown; channels?: unknown };
        if (!isInteger(entry.universe, 1, MAX_UNIVERSE) || universes.has(entry.universe)) {
            continue;
        }
        const seen = new Set<number>();
        const channels: Array<[number, number]> = [];
        for (const pair of Array.isArray(entry.channels) ? entry.channels : []) {
            if (Array.isArray(pair) && isInteger(pair[0], 1, UNIVERSE_SIZE) && isInteger(pair[1], 0, 255) && !seen.has(pair[0])) {
                seen.add(pair[0]);
                channels.push([pair[0], pair[1]]);
            }
        }
        universes.add(entry.universe);
        result.push({ universe: entry.universe, channels });
    }
    return result;
}

/**
 * Reads the memories of a file: invalid entries, repeated places and steps
 * of missing scenes are dropped with a console warning, so a damaged entry
 * never prevents opening the show.
 */
export function normalizeMemories(value: unknown): ShowMemories {
    const input = typeof value === 'object' && value !== null ? value as { scenes?: unknown; chasers?: unknown } : {};
    const ids = new Set<string>();
    const slots = new Set<number>();
    const scenes: Scene[] = [];
    for (const item of Array.isArray(input.scenes) ? input.scenes : []) {
        const entry = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof Scene, unknown>>;
        const name = readName(entry.name);
        if (typeof entry.id !== 'string' || entry.id === '' || ids.has(entry.id) || !isInteger(entry.slot, 1, SCENE_SLOTS) || slots.has(entry.slot) || name === null) {
            console.warn('Scene ignored, invalid data', item);
            continue;
        }
        ids.add(entry.id);
        slots.add(entry.slot);
        scenes.push({
            id: entry.id,
            slot: entry.slot,
            name,
            fadeIn: clampNumber(entry.fadeIn, FADE_LIMITS.min, FADE_LIMITS.max, 0),
            fadeOut: clampNumber(entry.fadeOut, FADE_LIMITS.min, FADE_LIMITS.max, 0),
            levels: readLevels(entry.levels),
            matrices: normalizeMatrixEffects(entry.matrices),
            audio: typeof entry.audio === 'string' && entry.audio !== '' ? entry.audio : null,
            video: readVideo(entry.video)
        });
    }

    const sceneIds = new Set(scenes.map((scene) => scene.id));
    const chaserSlots = new Set<number>();
    const chasers: Chaser[] = [];
    for (const item of Array.isArray(input.chasers) ? input.chasers : []) {
        const entry = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof Chaser, unknown>>;
        const name = readName(entry.name);
        if (typeof entry.id !== 'string' || entry.id === '' || ids.has(entry.id) || !isInteger(entry.slot, 1, CHASER_SLOTS) || chaserSlots.has(entry.slot) || name === null) {
            console.warn('Chaser ignored, invalid data', item);
            continue;
        }
        ids.add(entry.id);
        chaserSlots.add(entry.slot);
        const steps = (Array.isArray(entry.steps) ? entry.steps : [])
            .filter((step): step is string => typeof step === 'string' && sceneIds.has(step))
            .slice(0, MAX_CHASER_STEPS);
        chasers.push({
            id: entry.id,
            slot: entry.slot,
            name,
            steps,
            bpm: clampNumber(entry.bpm, BPM_LIMITS.min, BPM_LIMITS.max, DEFAULT_BPM),
            fade: clampNumber(entry.fade, 0, 1, 0),
            direction: CHASER_DIRECTIONS.includes(entry.direction as ChaserDirection) ? entry.direction as ChaserDirection : 'loop'
        });
    }

    const numbers = new Set<number>();
    const cues: Cue[] = [];
    for (const item of Array.isArray((input as { cues?: unknown }).cues) ? (input as { cues: unknown[] }).cues : []) {
        const entry = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof Cue, unknown>>;
        const number = typeof entry.number === 'number' ? roundCueNumber(entry.number) : NaN;
        if (typeof entry.id !== 'string' || entry.id === '' || ids.has(entry.id) || !isCueNumber(number) || numbers.has(number)
            || typeof entry.scene !== 'string' || !sceneIds.has(entry.scene) || cues.length >= MAX_CUES) {
            console.warn('Cue ignored, invalid data', item);
            continue;
        }
        ids.add(entry.id);
        numbers.add(number);
        const optionalSeconds = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value)
            ? Math.min(FADE_LIMITS.max, Math.max(FADE_LIMITS.min, value))
            : null;
        cues.push({
            id: entry.id,
            number,
            scene: entry.scene,
            note: typeof entry.note === 'string' ? entry.note.slice(0, CUE_NOTE_MAX_LENGTH) : '',
            fadeIn: optionalSeconds(entry.fadeIn),
            fadeOut: optionalSeconds(entry.fadeOut),
            follow: optionalSeconds(entry.follow)
        });
    }
    cues.sort((a, b) => a.number - b.number);
    return { scenes, chasers, cues };
}

/**
 * Cue number with one decimal digit.
 */
export function roundCueNumber(value: number): number {
    return Math.round(value * 10) / 10;
}

/**
 * Tells whether a number can be a cue number.
 */
export function isCueNumber(value: number): boolean {
    return Number.isFinite(value) && value >= CUE_NUMBER_LIMITS.min && value <= CUE_NUMBER_LIMITS.max;
}

/**
 * Cue number as shown to the operator: "3" or "3.5".
 */
export function formatCueNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
