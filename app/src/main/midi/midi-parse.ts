/**
 * Reading of the MIDI messages that can be mapped: note on and off,
 * control change, program change and pitch bend. Other messages (clock,
 * aftertouch, system) are left out.
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
