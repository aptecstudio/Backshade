/**
 * MIDI ports of the workstation, hosted by the playback window, which is
 * always open: the list of inputs and outputs (sent again at every plug or
 * unplug), the messages of the inputs, passed to the engine as bytes, and
 * the messages the engine sends to the outputs (feedback).
 * Without Web MIDI (or without permission) the list stays empty.
 */

import type { PlaybackStatus } from '../../shared/audio/playback-protocol.js';
import type { MidiDevice } from '../../shared/midi/midi.js';

let midiAccess: MIDIAccess | null = null;

/**
 * Sends a message to the output port with a name (feedback); nothing
 * happens when the port is not connected.
 */
export function sendMidi(device: string, data: readonly number[]): void {
    midiAccess?.outputs.forEach((output) => {
        if ((output.name ?? output.id) === device && output.state === 'connected') {
            output.send(data);
        }
    });
}

/**
 * Starts listening to the MIDI ports.
 * @param report - Sends a report to the engine
 */
export function startMidiHost(report: (status: PlaybackStatus) => void): void {
    if (typeof navigator.requestMIDIAccess !== 'function') {
        report({ type: 'midiDevices', devices: [] });
        return;
    }
    // System exclusive messages are needed to receive MIDI Show Control
    void navigator.requestMIDIAccess({ sysex: true }).then((access) => {
        midiAccess = access;
        const listened = new WeakSet<MIDIInput>();
        const refresh = (): void => {
            const devices: MidiDevice[] = [];
            access.inputs.forEach((input) => {
                devices.push({ id: input.id, name: input.name ?? input.id, kind: 'input', connected: input.state === 'connected' });
                if (!listened.has(input)) {
                    listened.add(input);
                    input.onmidimessage = (event) => {
                        if (event.data !== null && event.data.length > 0) {
                            report({ type: 'midiMessage', device: input.name ?? input.id, data: Array.from(event.data) });
                        }
                    };
                }
            });
            access.outputs.forEach((output) => {
                devices.push({ id: output.id, name: output.name ?? output.id, kind: 'output', connected: output.state === 'connected' });
            });
            report({ type: 'midiDevices', devices });
        };
        access.onstatechange = () => refresh();
        refresh();
    }).catch((error: unknown) => {
        console.warn('MIDI not available:', error instanceof Error ? error.message : error);
        report({ type: 'midiDevices', devices: [] });
    });
}
