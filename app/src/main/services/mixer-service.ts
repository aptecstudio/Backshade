/**
 * mixers.* methods: the external audio mixers of the open show (saved in
 * show.json) and the recall of their scenes over OSC. The scenes of
 * Backshade, their cues and the mixer tracks of the timelines recall
 * through the function given back to the engine.
 */

import { randomUUID } from 'node:crypto';
import { MAX_MIXERS, normalizeMixer, type MixerRecall, type ShowMixers } from '../../shared/mixers/mixers';
import { MixerSender } from '../mixers/mixer-sender';
import type { PlaybackWindow } from '../playback/playback-window';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireNumber, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/** Recall of mixer scenes for the rest of the engine */
export interface MixerRecaller {
    /** Recalls a scene during the show; a missing mixer is ignored, errors are logged */
    recall(recall: MixerRecall): void;
}

/**
 * Registers the methods of the service.
 */
export function registerMixerService(router: RequestRouter, bus: EventBus, session: ShowSession, playback: PlaybackWindow): MixerRecaller {
    // MIDI mixers are reached through the MIDI ports of the playback window
    const sender = new MixerSender((device, data) => playback.send({ type: 'midiSend', device, data }));
    const mixersOf = (): ShowMixers => session.summary() === null ? { mixers: [] } : session.mixers();
    const update = (change: (mixers: ShowMixers) => ShowMixers): ShowMixers => {
        session.setMixers(change(session.mixers()));
        return session.mixers();
    };
    const find = (id: string) => {
        const mixer = mixersOf().mixers.find((item) => item.id === id);
        if (mixer === undefined) {
            throw new EngineError('mixer-not-found', `Mixer not found: ${id}`);
        }
        return mixer;
    };

    session.onContentChange((part) => {
        if (part === 'mixers' || part === 'all') {
            bus.emit('mixers.changed', {});
        }
    });

    router.register('mixers.get', () => mixersOf());

    router.register('mixers.save', (params) => {
        const input = requireObject(requireObject(params).mixer);
        const id = typeof input.id === 'string' && input.id !== '' ? input.id : randomUUID();
        const mixer = normalizeMixer({ ...input, id });
        if (mixer === null) {
            throw new EngineError('invalid-params', 'Invalid mixer');
        }
        const exists = session.mixers().mixers.some((item) => item.id === id);
        if (!exists && session.mixers().mixers.length >= MAX_MIXERS) {
            throw new EngineError('too-many-mixers', 'No more mixers');
        }
        return update(({ mixers }) => ({ mixers: exists ? mixers.map((item) => item.id === id ? mixer : item) : [...mixers, mixer] }));
    });

    router.register('mixers.delete', (params) => {
        const id = find(requireString(requireObject(params), 'id')).id;
        return update(({ mixers }) => ({ mixers: mixers.filter((item) => item.id !== id) }));
    });

    // Test from the interface: errors go back to it
    router.register('mixers.recall', async (params) => {
        const input = requireObject(params);
        const mixer = find(requireString(input, 'mixer'));
        try {
            await sender.recall(mixer, requireNumber(input, 'number'));
        } catch (error) {
            throw new EngineError('mixer-unreachable', error instanceof Error ? error.message : String(error));
        }
        return undefined;
    });

    return {
        recall: (recall) => {
            const mixer = mixersOf().mixers.find((item) => item.id === recall.mixer);
            if (mixer !== undefined) {
                sender.recallLive(mixer, recall.number);
            }
        }
    };
}
