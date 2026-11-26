/**
 * audio.* methods: the player and playlist of the open show (saved in the
 * show, audio.changed) and the playback (running session,
 * audio.stateChanged), played by the playback window.
 */

import { randomUUID } from 'node:crypto';
import { AUDIO_NAME_MAX_LENGTH, MAX_AUDIO_ITEMS, type AudioItem, type ShowAudio } from '../../shared/audio/audio';
import { mediaKindOf } from '../../shared/show/media-kinds';
import { FADE_LIMITS } from '../../shared/show/show-settings';
import { AudioEngine } from '../audio/audio-engine';
import type { PlaybackWindow } from '../playback/playback-window';
import { setShowMediaFolder } from '../protocol/show-media-route';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { optionalBoolean, optionalString, requireNumber, requireObject, requireString, requireStringArray } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

function unit(input: Record<string, unknown>, field: string): number {
    const value = requireNumber(input, field);
    if (value < 0 || value > 1) {
        throw new EngineError('invalid-params', `Invalid field "${field}"`);
    }
    return value;
}

function seconds(input: Record<string, unknown>, field: string, max = 24 * 3600): number {
    const value = requireNumber(input, field);
    if (value < 0 || value > max) {
        throw new EngineError('invalid-params', `Invalid field "${field}"`);
    }
    return value;
}

/**
 * Registers the methods of the service.
 * @returns the audio engine, also used by the scenes and cues
 */
export function registerAudioService(router: RequestRouter, bus: EventBus, session: ShowSession, window: PlaybackWindow): AudioEngine {
    const audioOf = (): ShowAudio | null => session.summary() === null ? null : session.audio();
    const engine = new AudioEngine(window, audioOf, (state) => bus.emit('audio.stateChanged', { state }));
    const followShow = (): void => setShowMediaFolder(session.summary()?.folder ?? null);

    session.onContentChange((part) => {
        if (part === 'all') {
            engine.reset();
            followShow();
            engine.applyOutput();
            bus.emit('audio.changed', {});
        } else if (part === 'audio') {
            engine.applyOutput();
            bus.emit('audio.changed', {});
        }
    });
    followShow();

    const update = (change: (audio: ShowAudio) => ShowAudio): ShowAudio => {
        session.setAudio(change(session.audio()));
        return session.audio();
    };
    const requireItem = (id: string): AudioItem => {
        const item = session.audio().items.find((entry) => entry.id === id);
        if (item === undefined) {
            throw new EngineError('audio-item-not-found', `Audio item not found: ${id}`);
        }
        return item;
    };

    router.register('audio.get', () => session.audio());
    router.register('audio.getState', () => engine.state());
    router.register('audio.listDevices', () => engine.devices());

    router.register('audio.setPlayer', (params) => {
        const input = requireObject(params);
        const device = optionalString(input, 'device');
        const autoAdvance = optionalBoolean(input, 'autoAdvance');
        return update((audio) => ({
            ...audio,
            ...(device === undefined ? {} : { device }),
            ...(input.volume === undefined ? {} : { volume: unit(input, 'volume') }),
            ...(autoAdvance === undefined ? {} : { autoAdvance })
        }));
    });

    router.register('audio.addItems', (params) => {
        const files = requireStringArray(requireObject(params), 'files');
        if (files.some((file) => mediaKindOf(file) !== 'audio')) {
            throw new EngineError('invalid-media-path', 'Only audio files can be added to the playlist');
        }
        return update((audio) => {
            if (audio.items.length + files.length > MAX_AUDIO_ITEMS) {
                throw new EngineError('too-many-items', 'The playlist is full');
            }
            const added: AudioItem[] = files.map((file) => ({
                id: randomUUID(),
                file,
                name: (file.split('/').pop() ?? file).replace(/\.[^.]+$/, '').slice(0, AUDIO_NAME_MAX_LENGTH),
                start: 0,
                end: null,
                fadeIn: 0,
                fadeOut: 0,
                volume: 1,
                loop: false
            }));
            return { ...audio, items: [...audio.items, ...added] };
        });
    });

    router.register('audio.updateItem', (params) => {
        const input = requireObject(params);
        const item = requireItem(requireString(input, 'id'));
        const start = seconds(input, 'start');
        const end = input.end === null ? null : seconds(input, 'end');
        if (end !== null && end <= start) {
            throw new EngineError('invalid-params', 'The end must come after the start');
        }
        const name = requireString(input, 'name').trim();
        const next: AudioItem = {
            ...item,
            name: (name === '' ? item.name : name).slice(0, AUDIO_NAME_MAX_LENGTH),
            start,
            end,
            fadeIn: seconds(input, 'fadeIn', FADE_LIMITS.max),
            fadeOut: seconds(input, 'fadeOut', FADE_LIMITS.max),
            volume: unit(input, 'volume'),
            loop: optionalBoolean(input, 'loop') === true
        };
        return update((audio) => ({ ...audio, items: audio.items.map((entry) => entry.id === next.id ? next : entry) }));
    });

    router.register('audio.removeItem', (params) => {
        const id = requireItem(requireString(requireObject(params), 'id')).id;
        if (engine.state().item === id) {
            engine.stop(0);
        }
        return update((audio) => ({ ...audio, items: audio.items.filter((entry) => entry.id !== id) }));
    });

    router.register('audio.moveItem', (params) => {
        const input = requireObject(params);
        const id = requireItem(requireString(input, 'id')).id;
        const position = requireNumber(input, 'to');
        return update((audio) => {
            const items = [...audio.items];
            const from = items.findIndex((entry) => entry.id === id);
            const to = Math.max(0, Math.min(items.length - 1, Math.round(position)));
            const [moved] = items.splice(from, 1);
            items.splice(to, 0, moved);
            return { ...audio, items };
        });
    });

    router.register('audio.play', (params) => {
        const id = optionalString(requireObject(params ?? {}), 'id');
        if (id === undefined) {
            if (engine.state().paused) {
                engine.togglePause();
            } else if (engine.state().item === null) {
                engine.step(1);
            }
        } else {
            engine.play(requireItem(id).id);
        }
        return engine.state();
    });
    router.register('audio.stop', () => {
        engine.stop();
        return engine.state();
    });
    router.register('audio.pause', () => {
        engine.togglePause();
        return engine.state();
    });
    router.register('audio.next', () => {
        engine.step(1);
        return engine.state();
    });
    router.register('audio.previous', () => {
        engine.step(-1);
        return engine.state();
    });

    return engine;
}
