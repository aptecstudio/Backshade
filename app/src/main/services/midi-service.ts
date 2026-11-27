/**
 * midi.* methods: the MIDI ports of the workstation, MIDI learn and the
 * mappings of the open show (saved in show.json). Ports and messages come
 * from the playback window, which hosts Web MIDI.
 */

import { randomUUID } from 'node:crypto';
import { MAX_MIDI_MAPPINGS, normalizeTarget, sameInput } from '../../shared/midi/midi';
import { MidiActions } from '../midi/midi-actions';
import { MidiEngine } from '../midi/midi-engine';
import type { PlaybackWindow } from '../playback/playback-window';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireBoolean, requireChoice, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Registers the methods of the service.
 */
export function registerMidiService(router: RequestRouter, bus: EventBus, session: ShowSession, playback: PlaybackWindow): MidiEngine {
    const mappings = () => session.summary() === null ? [] : session.midi().mappings;
    const engine = new MidiEngine(new MidiActions(router), {
        mappings,
        learned: (input, target, mode) => {
            if (session.summary() === null) {
                return;
            }
            const others = session.midi().mappings.filter((mapping) => !sameInput(mapping.input, input));
            if (others.length >= MAX_MIDI_MAPPINGS) {
                return;
            }
            session.setMidi({ mappings: [...others, { id: randomUUID(), input, target, mode }] });
        }
    }, (state) => bus.emit('midi.stateChanged', { state }));

    // The playback window hosts the MIDI ports: it opens at once, so controllers work from the start
    playback.open();
    playback.onStatus((status) => {
        if (status.type === 'midiDevices') {
            engine.setDevices(status.devices);
        } else if (status.type === 'midiMessage') {
            engine.receive(status.device, status.data);
        }
    });

    session.onContentChange((part) => {
        if (part === 'midi' || part === 'all') {
            engine.mappingsChanged();
            bus.emit('midi.changed', {});
        }
        if (part === 'all') {
            engine.setLearn(false);
        }
    });

    router.register('midi.getState', () => engine.state());
    router.register('midi.getMappings', () => session.summary() === null ? { mappings: [] } : session.midi());

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

    router.register('midi.deleteMapping', (params) => {
        const id = requireString(requireObject(params), 'id');
        session.setMidi({ mappings: session.midi().mappings.filter((mapping) => mapping.id !== id) });
        return session.midi();
    });

    router.register('midi.clearMappings', (params) => {
        // Only the mappings of one device, or all of them
        const device = typeof (params as { device?: unknown } | undefined)?.device === 'string' ? (params as { device: string }).device : null;
        session.setMidi({ mappings: device === null ? [] : session.midi().mappings.filter((mapping) => mapping.input.device !== device) });
        return session.midi();
    });

    return engine;
}
