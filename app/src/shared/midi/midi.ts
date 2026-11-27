/**
 * MIDI layer (Phase 16.2): controllers connected to the workstation drive
 * the show. A mapping ties a MIDI message of a device (note, control
 * change, program change or pitch bend, on a channel) to a target: the same
 * actions as the widgets of the grid (scenes, chasers, cues, masters, groups,
 * DMX channels, desk commands, audio, timers) plus the transport of the
 * timeline. Mappings are saved in the show with the name of their device, so
 * the same show keeps different mappings for the controllers of different
 * workstations. Shared between engine and interface.
 */

import { normalizeLink, type WidgetLink } from '../grid/grid.js';

/** Kind of MIDI message */
export type MidiMessageKind = 'note' | 'cc' | 'program' | 'pitch';
export const MIDI_MESSAGE_KINDS: readonly MidiMessageKind[] = ['note', 'cc', 'program', 'pitch'];

/** Message of a mapping: device name, kind, channel 1 to 16, note or controller number (0 for pitch bend) */
export interface MidiInputKey {
    device: string;
    kind: MidiMessageKind;
    channel: number;
    number: number;
}

/** Commands of the timeline transport */
export type TimelineCommand = 'toggle' | 'stop' | 'go' | 'back';
export const TIMELINE_COMMANDS: readonly TimelineCommand[] = ['toggle', 'stop', 'go', 'back'];

/** What a mapping drives: a link of the grid, or the transport of the timeline */
export type MidiTarget = WidgetLink | { kind: 'timeline'; action: TimelineCommand };

/** How a message acts: a key (press and release) or a level (fader, knob) */
export type MidiMode = 'button' | 'level';

/**
 * How a control change carries a level: absolute (0 to 127), or relative
 * for endless encoders: two's complement (1 to 63 up, 127 down to 65 down)
 * or offset 64 (65 and more up, 63 and less down)
 */
export type MidiEncoding = 'absolute' | 'relative2c' | 'relative64';
export const MIDI_ENCODINGS: readonly MidiEncoding[] = ['absolute', 'relative2c', 'relative64'];

/** Mapping of a message to a target */
export interface MidiMapping {
    id: string;
    input: MidiInputKey;
    target: MidiTarget;
    mode: MidiMode;
    /** Level mappings on control changes: absolute or relative encoder; missing in older files */
    encoding: MidiEncoding;
}

/** MIDI Show Control received from a show controller: Go, Stop, Resume and Reset act on the cue list */
export interface MscSettings {
    enabled: boolean;
    /** Device identifier this show answers to, 0 to 111; 127 (all) is always accepted */
    deviceId: number;
}

/** MIDI section of show.json */
export interface ShowMidi {
    mappings: MidiMapping[];
    msc: MscSettings;
}

export const EMPTY_MIDI: ShowMidi = { mappings: [], msc: { enabled: false, deviceId: 1 } };

/** Message received or sent, for the MIDI monitor */
export interface MidiMonitorEntry {
    /** Wall clock time, milliseconds */
    time: number;
    direction: 'in' | 'out';
    device: string;
    /** Kind of the message, null for the others (clock, system exclusive) */
    kind: MidiMessageKind | null;
    channel: number;
    number: number;
    /** Raw value, 0 to 127 (0 to 16383 for pitch bend) */
    value: number;
    /** Text of a MIDI Show Control command, empty for the others */
    msc: string;
}

/** Most mappings of a show */
export const MAX_MIDI_MAPPINGS = 2000;

/** MIDI port of the workstation */
export interface MidiDevice {
    id: string;
    name: string;
    kind: 'input' | 'output';
    connected: boolean;
}

/** State of the MIDI layer, for the interface */
export interface MidiState {
    /** MIDI learn: touching a control and moving a controller ties them */
    learn: boolean;
    /** Control chosen in learn mode, waiting for a message */
    pending: { target: MidiTarget; mode: MidiMode } | null;
    devices: MidiDevice[];
}

/** Targets that are levels (faders and knobs); the others are keys */
export function isLevelTarget(target: MidiTarget): boolean {
    return target.kind === 'master' || target.kind === 'group';
}

/** Same message of a mapping */
export function sameInput(a: MidiInputKey, b: MidiInputKey): boolean {
    return a.device === b.device && a.kind === b.kind && a.channel === b.channel && (a.kind === 'pitch' || a.number === b.number);
}

/** Same target of two mappings */
export function sameTarget(a: MidiTarget, b: MidiTarget): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

/** Reads a target; null when invalid */
export function normalizeTarget(value: unknown): MidiTarget | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
    if (input.kind === 'timeline') {
        return TIMELINE_COMMANDS.includes(input.action as TimelineCommand) ? { kind: 'timeline', action: input.action as TimelineCommand } : null;
    }
    const link = normalizeLink(value);
    return link.kind === 'none' ? null : link;
}

/** Reads the message of a mapping; null when invalid */
export function normalizeInput(value: unknown): MidiInputKey | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof MidiInputKey, unknown>>;
    const isInt = (item: unknown, min: number, max: number): item is number => typeof item === 'number' && Number.isInteger(item) && item >= min && item <= max;
    if (typeof input.device !== 'string' || input.device === '' || !MIDI_MESSAGE_KINDS.includes(input.kind as MidiMessageKind)
        || !isInt(input.channel, 1, 16) || !isInt(input.number, 0, 127)) {
        return null;
    }
    return { device: input.device.slice(0, 200), kind: input.kind as MidiMessageKind, channel: input.channel, number: input.number };
}

/** Reads the MIDI section of a file */
export function normalizeMidi(value: unknown): ShowMidi {
    const input = (typeof value === 'object' && value !== null ? value : {}) as { mappings?: unknown };
    const ids = new Set<string>();
    const mappings: MidiMapping[] = [];
    for (const raw of Array.isArray(input.mappings) ? input.mappings.slice(0, MAX_MIDI_MAPPINGS) : []) {
        const entry = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof MidiMapping, unknown>>;
        const key = normalizeInput(entry.input);
        const target = normalizeTarget(entry.target);
        if (typeof entry.id !== 'string' || entry.id === '' || ids.has(entry.id) || key === null || target === null) {
            continue;
        }
        ids.add(entry.id);
        const encoding = key.kind === 'cc' && MIDI_ENCODINGS.includes(entry.encoding as MidiEncoding) ? entry.encoding as MidiEncoding : 'absolute';
        mappings.push({ id: entry.id, input: key, target, mode: entry.mode === 'level' ? 'level' : 'button', encoding });
    }
    const msc = (typeof (input as { msc?: unknown }).msc === 'object' && (input as { msc?: unknown }).msc !== null ? (input as { msc: Record<string, unknown> }).msc : {}) as Record<string, unknown>;
    const deviceId = typeof msc.deviceId === 'number' && Number.isInteger(msc.deviceId) && msc.deviceId >= 0 && msc.deviceId <= 111 ? msc.deviceId : 1;
    return { mappings, msc: { enabled: msc.enabled === true, deviceId } };
}
