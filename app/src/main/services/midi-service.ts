/**
 * midi.* methods: the MIDI ports of the workstation, MIDI learn, the
 * mappings of the open show (saved in show.json) with their encoding, the
 * MIDI Show Control settings, the feedback to the controllers and the
 * monitor of the messages. Ports and messages go through the playback
 * window, which hosts Web MIDI.
 */

import { randomUUID } from 'node:crypto';
import { MAX_MIDI_MAPPINGS, MIDI_ENCODINGS, normalizeTarget, sameInput, type MidiMonitorEntry, type ShowMidi } from '../../shared/midi/midi';
import { MidiActions } from '../midi/midi-actions';
import { MidiEngine } from '../midi/midi-engine';
import { MidiFeedback } from '../midi/midi-feedback';
import { parseMidi } from '../midi/midi-parse';
import type { PlaybackWindow } from '../playback/playback-window';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireBoolean, requireChoice, requireObject, requireRange, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

// Monitor: messages sent to the interface together, and the most kept between two sends
const MONITOR_MS = 150;
const MONITOR_MAX = 200;
// A message equal to one just sent to a port of the same name is its echo (loopback ports, echoing controllers)
const ECHO_MS = 100;

/**
 * Registers the methods of the service.
 */
export function registerMidiService(router: RequestRouter, bus: EventBus, session: ShowSession, playback: PlaybackWindow): MidiEngine {
    const midiOf = (): ShowMidi => session.summary() === null ? { mappings: [], msc: { enabled: false, deviceId: 1 } } : session.midi();
    const actions = new MidiActions(router);
    let monitoring = false;
    let entries: MidiMonitorEntry[] = [];
    const traffic = (entry: MidiMonitorEntry): void => {
        if (monitoring) {
            entries.push(entry);
            if (entries.length > MONITOR_MAX) {
                entries = entries.slice(-MONITOR_MAX);
            }
        }
    };
    const monitorTimer = setInterval(() => {
        if (entries.length > 0) {
            bus.emit('midi.monitor', { entries });
            entries = [];
        }
    }, MONITOR_MS);
    monitorTimer.unref();

    const echoes = new Map<string, number>();
    const feedback = new MidiFeedback(actions, () => midiOf().mappings, () => engine.outputs(), (device, data) => {
        const now = Date.now();
        if (echoes.size > 500) {
            [...echoes].filter(([, time]) => now - time > ECHO_MS).forEach(([key]) => echoes.delete(key));
        }
        echoes.set(`${device} ${data.join(',')}`, now);
        playback.send({ type: 'midiSend', device, data });
        const event = parseMidi(data);
        traffic({ time: Date.now(), direction: 'out', device, kind: event?.kind ?? null, channel: event?.channel ?? 0, number: event?.number ?? 0, value: event?.kind === 'pitch' ? Math.round(event.value * 16383) : data[2] ?? 0, msc: '' });
    });

    const engine = new MidiEngine(actions, {
        mappings: () => midiOf().mappings,
        msc: () => midiOf().msc,
        learned: (input, target, mode) => {
            if (session.summary() === null) {
                return;
            }
            const midi = session.midi();
            const others = midi.mappings.filter((mapping) => !sameInput(mapping.input, input));
            if (others.length >= MAX_MIDI_MAPPINGS) {
                return;
            }
            session.setMidi({ ...midi, mappings: [...others, { id: randomUUID(), input, target, mode, encoding: 'absolute' }] });
        }
    }, {
        state: (state) => {
            // A port plugged or unplugged: the feedback sends everything again
            feedback.reset();
            bus.emit('midi.stateChanged', { state });
        },
        traffic,
        mapped: (mapping) => feedback.touch(mapping)
    });

    // The playback window hosts the MIDI ports: it opens at once, so controllers work from the start
    playback.open();
    playback.onStatus((status) => {
        if (status.type === 'midiDevices') {
            engine.setDevices(status.devices);
        } else if (status.type === 'midiMessage') {
            const key = `${status.device} ${status.data.join(',')}`;
            const sent = echoes.get(key);
            if (sent !== undefined && Date.now() - sent < ECHO_MS) {
                echoes.delete(key);
                return;
            }
            engine.receive(status.device, status.data);
        }
    });
    feedback.start();

    session.onContentChange((part) => {
        if (part === 'midi' || part === 'all') {
            engine.mappingsChanged();
            feedback.reset();
            bus.emit('midi.changed', {});
        }
        if (part === 'all') {
            engine.setLearn(false);
        }
    });

    const change = (edit: (midi: ShowMidi) => ShowMidi): ShowMidi => {
        if (session.summary() === null) {
            throw new EngineError('no-show', 'No show open');
        }
        session.setMidi(edit(session.midi()));
        return session.midi();
    };

    router.register('midi.getState', () => engine.state());
    router.register('midi.getMappings', () => midiOf());

    router.register('midi.setLearn', (params) => {
        if (session.summary() === null) {
            throw new EngineError('no-show', 'No show open');
        }
        engine.setLearn(requireBoolean(requireObject(params), 'on'));
        return engine.state();
    });

    router.register('midi.choose', (params) => {
        const input = requireObject(params);
        const target = normalizeTarget(input.target);
        if (target === null) {
            throw new EngineError('invalid-params', 'Invalid target');
        }
        engine.choose(target, requireChoice(input, 'mode', ['button', 'level'] as const));
        return engine.state();
    });

    router.register('midi.updateMapping', (params) => {
        const input = requireObject(params);
        const id = requireString(input, 'id');
        const encoding = requireChoice(input, 'encoding', MIDI_ENCODINGS);
        return change((midi) => ({
            ...midi,
            mappings: midi.mappings.map((mapping) => mapping.id === id && mapping.input.kind === 'cc' ? { ...mapping, encoding } : mapping)
        }));
    });

    router.register('midi.deleteMapping', (params) => {
        const id = requireString(requireObject(params), 'id');
        return change((midi) => ({ ...midi, mappings: midi.mappings.filter((mapping) => mapping.id !== id) }));
    });

    router.register('midi.clearMappings', (params) => {
        // Only the mappings of one device, or all of them
        const device = typeof (params as { device?: unknown } | undefined)?.device === 'string' ? (params as { device: string }).device : null;
        return change((midi) => ({ ...midi, mappings: device === null ? [] : midi.mappings.filter((mapping) => mapping.input.device !== device) }));
    });

    router.register('midi.setMsc', (params) => {
        const input = requireObject(params);
        const msc = { enabled: requireBoolean(input, 'enabled'), deviceId: requireRange(input, 'deviceId', 0, 111) };
        return change((midi) => ({ ...midi, msc }));
    });

    router.register('midi.setMonitor', (params) => {
        monitoring = requireBoolean(requireObject(params), 'on');
        entries = [];
        return undefined;
    });

    return engine;
}
