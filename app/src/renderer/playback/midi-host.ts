/**
 * MIDI ports of the workstation, hosted by the playback window, which is
 * always open: the list of inputs and outputs (sent again at every plug or
 * unplug) and the messages of the inputs, passed to the engine as bytes.
 * Without Web MIDI (or without permission) the list stays empty.
 */

import type { PlaybackStatus } from '../../shared/audio/playback-protocol.js';
import type { MidiDevice } from '../../shared/midi/midi.js';

/**
 * Starts listening to the MIDI ports.
 * @param report - Sends a report to the engine
 */
export function startMidiHost(report: (status: PlaybackStatus) => void): void {
    if (typeof navigator.requestMIDIAccess !== 'function') {
        report({ type: 'midiDevices', devices: [] });
        return;
    }
    void navigator.requestMIDIAccess({ sysex: false }).then((access) => {
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
