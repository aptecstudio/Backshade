/**
 * Audio of a show: one player with a playlist (decided by the human),
 * saved in show.json under "audio". Every item plays a file of the show
 * media between a start and an end time, with its own fades, volume and
 * repeat; the player sends its sound to one audio output of the computer.
 * Shared between engine and interface.
 */

import { FADE_LIMITS } from '../show/show-settings.js';

/** Most items in the playlist */
export const MAX_AUDIO_ITEMS = 500;

/** Longest name of an item */
export const AUDIO_NAME_MAX_LENGTH = 100;

/** Item of the playlist */
export interface AudioItem {
    id: string;
    /** File of the show media, relative to media/ */
    file: string;
    name: string;
    /** Start and end time in the file, in seconds; null end for the end of the file */
    start: number;
    end: number | null;
    /** Fades of the item, in seconds */
    fadeIn: number;
    fadeOut: number;
    /** Volume of the item, 0 to 1 */
    volume: number;
    /** Plays again from the start time when it reaches the end */
    loop: boolean;
}

/** Audio section of show.json */
export interface ShowAudio {
    /** Audio output: device identifier, empty for the default output of the system */
    device: string;
    /** Volume of the player, 0 to 1 */
    volume: number;
    /** At the end of an item the next one starts */
    autoAdvance: boolean;
    items: AudioItem[];
}

/** Audio of a new show */
export const EMPTY_AUDIO: ShowAudio = { device: '', volume: 1, autoAdvance: false, items: [] };

/** Audio output of the computer */
export interface AudioDevice {
    id: string;
    label: string;
}

/** Playback state of the player */
export interface AudioPlayback {
    /** Item playing, null when stopped */
    item: string | null;
    paused: boolean;
    /** Position in the file and duration of the file, in seconds */
    position: number;
    duration: number;
    /** Started by a scene or cue (true) or by the player keys (false) */
    fromScene: boolean;
}

const seconds = (value: unknown, fallback: number, max = 24 * 3600): number =>
    typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback;

/**
 * Reads the audio of a file: invalid items are dropped, values are kept in their limits.
 */
export function normalizeAudio(value: unknown): ShowAudio {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof ShowAudio, unknown>>;
    const ids = new Set<string>();
    const items: AudioItem[] = [];
    for (const raw of Array.isArray(input.items) ? input.items.slice(0, MAX_AUDIO_ITEMS) : []) {
        const item = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof AudioItem, unknown>>;
        if (typeof item.id !== 'string' || item.id === '' || ids.has(item.id) || typeof item.file !== 'string' || item.file === '') {
            continue;
        }
        ids.add(item.id);
        const start = seconds(item.start, 0);
        const end = item.end === null || item.end === undefined ? null : seconds(item.end, 0);
        items.push({
            id: item.id,
            file: item.file,
            name: typeof item.name === 'string' ? item.name.slice(0, AUDIO_NAME_MAX_LENGTH) : item.file,
            start,
            end: end !== null && end > start ? end : null,
            fadeIn: seconds(item.fadeIn, 0, FADE_LIMITS.max),
            fadeOut: seconds(item.fadeOut, 0, FADE_LIMITS.max),
            volume: seconds(item.volume, 1, 1),
            loop: item.loop === true
        });
    }
    return {
        device: typeof input.device === 'string' ? input.device : '',
        volume: seconds(input.volume, 1, 1),
        autoAdvance: input.autoAdvance === true,
        items
    };
}
