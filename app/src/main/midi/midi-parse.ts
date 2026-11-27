/**
 * Reading of the MIDI messages that can be mapped: note on and off,
 * control change, program change and pitch bend, and of the MIDI Show
 * Control commands for the cue list. Other messages (clock, aftertouch,
 * other system messages) are left out.
 */

import type { MidiMessageKind } from '../../shared/midi/midi';

/** Message read from the bytes of an input */
export interface MidiEvent {
    kind: MidiMessageKind;
    /** Channel 1 to 16 */
    channel: number;
    /** Note or controller number; 0 for pitch bend */
    number: number;
    /** Value 0 to 1: velocity, controller value, bend position */
    value: number;
    /** Key pressed (true) or released (false) */
    pressed: boolean;
}

/**
 * Reads a message; null for messages that cannot be mapped.
 */
export function parseMidi(data: readonly number[]): MidiEvent | null {
    const status = data[0] ?? 0;
    const type = status & 0xf0;
    const channel = (status & 0x0f) + 1;
    const first = (data[1] ?? 0) & 0x7f;
    const second = (data[2] ?? 0) & 0x7f;
    switch (type) {
        case 0x90:
            return { kind: 'note', channel, number: first, value: second / 127, pressed: second > 0 };
        case 0x80:
            return { kind: 'note', channel, number: first, value: 0, pressed: false };
        case 0xb0:
            return { kind: 'cc', channel, number: first, value: second / 127, pressed: second > 0 };
        case 0xc0:
            return { kind: 'program', channel, number: first, value: 1, pressed: true };
        case 0xe0:
            return { kind: 'pitch', channel, number: 0, value: ((second << 7) | first) / 16383, pressed: true };
        default:
            return null;
    }
}

/** MIDI Show Control commands that act on the cue list */
export type MscCommand = 'go' | 'stop' | 'resume' | 'reset';

/** MIDI Show Control message */
export interface MscEvent {
    /** Device identifier the message is sent to, 0 to 127 (127 for all) */
    deviceId: number;
    command: MscCommand;
    /** Cue number of the command ("12.5"), null without one */
    cue: string | null;
}

const MSC_COMMANDS: Readonly<Record<number, MscCommand>> = { 0x01: 'go', 0x02: 'stop', 0x03: 'resume', 0x0a: 'reset', 0x0b: 'reset' };
// Command formats of lighting: lighting in general, moving lights, all types
const MSC_FORMATS = new Set([0x01, 0x02, 0x7f]);

/**
 * Reads a MIDI Show Control message (system exclusive F0 7F id 02 format
 * command data F7); null for other messages and other command formats.
 */
export function parseMsc(data: readonly number[]): MscEvent | null {
    if (data.length < 6 || data[0] !== 0xf0 || data[1] !== 0x7f || data[3] !== 0x02 || !MSC_FORMATS.has(data[4])) {
        return null;
    }
    const command = MSC_COMMANDS[data[5]];
    if (command === undefined) {
        return null;
    }
    // The cue number is ASCII digits and points, ended by 00 (then the list) or by F7
    let cue = '';
    for (let index = 6; index < data.length && data[index] !== 0x00 && data[index] !== 0xf7; index++) {
        cue += String.fromCharCode(data[index]);
    }
    return { deviceId: data[2], command, cue: /^\d+(\.\d+)?$/.test(cue) ? cue : null };
}
