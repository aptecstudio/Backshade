/**
 * Controls that MIDI can drive: a control is marked with its target (the
 * action it does) and its mode (a key, or a level for faders and knobs).
 * In MIDI learn mode, touching a marked control chooses it, and the next
 * message of a controller is tied to it.
 */

import type { Component } from '../../framework/ts/index.js';
import type { MidiMode, MidiTarget } from '../../shared/midi/midi.js';

/** Attributes of the controls that can be mapped */
export const MIDI_ATTRIBUTE = 'data-midi';
export const MIDI_MODE_ATTRIBUTE = 'data-midi-mode';

/**
 * Marks a control as a MIDI target.
 */
export function markMidi(item: Component | HTMLElement, target: MidiTarget, mode: MidiMode): void {
    const element = item instanceof HTMLElement ? item : item.element;
    element.setAttribute(MIDI_ATTRIBUTE, JSON.stringify(target));
    element.setAttribute(MIDI_MODE_ATTRIBUTE, mode);
}

/**
 * Removes the mark of a control, for example a key with no memory.
 */
export function unmarkMidi(item: Component | HTMLElement): void {
    const element = item instanceof HTMLElement ? item : item.element;
    element.removeAttribute(MIDI_ATTRIBUTE);
    element.removeAttribute(MIDI_MODE_ATTRIBUTE);
}

/**
 * Target and mode of a marked element; null when it is not marked or invalid.
 */
export function readMidi(element: Element): { target: MidiTarget; mode: MidiMode } | null {
    const raw = element.getAttribute(MIDI_ATTRIBUTE);
    if (raw === null) {
        return null;
    }
    try {
        return { target: JSON.parse(raw) as MidiTarget, mode: element.getAttribute(MIDI_MODE_ATTRIBUTE) === 'level' ? 'level' : 'button' };
    } catch {
        return null;
    }
}
