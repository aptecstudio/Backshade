/**
 * cues.* methods: the cue list of the simple console. Cues are saved in
 * the show with the memories (memories.changed tells the windows); the
 * playback state belongs to the running session (cues.stateChanged).
 */

import { randomUUID } from 'node:crypto';
import { CUE_NOTE_MAX_LENGTH, MAX_CUES, isCueNumber, roundCueNumber, type Cue, type ShowMemories } from '../../shared/console/memories';
import { FADE_LIMITS } from '../../shared/show/show-settings';
import { CueStack } from '../console/cue-stack';
import type { MemoryPlayer } from '../console/memory-player';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireNumber, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

function optionalSeconds(input: Record<string, unknown>, field: string): number | null {
    if (input[field] === null) {
        return null;
    }
    const value = requireNumber(input, field);
    if (value < FADE_LIMITS.min || value > FADE_LIMITS.max) {
        throw new EngineError('invalid-params', `Invalid field "${field}"`);
    }
    return value;
}

/**
 * Registers the methods of the service.
 */
export function registerCueService(router: RequestRouter, bus: EventBus, session: ShowSession, player: MemoryPlayer): void {
    const cuesOf = (): readonly Cue[] => session.summary() === null ? [] : session.memories().cues;
    const stack = new CueStack({ player, cues: cuesOf, onState: (state) => bus.emit('cues.stateChanged', { state }) });

    session.onContentChange((part) => {
        if (part === 'all') {
            stack.reset();
        } else if (part === 'memories') {
            stack.cuesChanged();
        }
    });

    const update = (change: (memories: ShowMemories) => ShowMemories): void => {
        session.setMemories(change(session.memories()));
    };
    const requireCue = (id: string): Cue => {
        const cue = session.memories().cues.find((item) => item.id === id);
        if (cue === undefined) {
            throw new EngineError('cue-not-found', `Cue not found: ${id}`);
        }
        return cue;
    };
    const requireSceneId = (id: string): string => {
        if (!session.memories().scenes.some((scene) => scene.id === id)) {
            throw new EngineError('memory-not-found', `Scene not found: ${id}`);
        }
        return id;
    };
    const saveCue = (cue: Cue): Cue => {
        update((memories) => ({ ...memories, cues: [...memories.cues.filter((item) => item.id !== cue.id), cue].sort((a, b) => a.number - b.number) }));
        return cue;
    };

    router.register('cues.getState', () => stack.state());

    router.register('cues.add', (params) => {
        const scene = requireSceneId(requireString(requireObject(params), 'scene'));
        const cues = session.memories().cues;
        if (cues.length >= MAX_CUES) {
            throw new EngineError('too-many-cues', 'The cue list is full');
        }
        const last = cues[cues.length - 1]?.number ?? 0;
        const number = Math.floor(last) + 1;
        if (!isCueNumber(number)) {
            throw new EngineError('too-many-cues', 'No cue number available');
        }
        return saveCue({ id: randomUUID(), number, scene, note: '', fadeIn: null, fadeOut: null, follow: null });
    });

    router.register('cues.update', (params) => {
        const input = requireObject(params);
        const cue = requireCue(requireString(input, 'id'));
        const number = roundCueNumber(requireNumber(input, 'number'));
        if (!isCueNumber(number)) {
            throw new EngineError('invalid-cue-number', `Invalid cue number: ${number}`);
        }
        if (session.memories().cues.some((item) => item.number === number && item.id !== cue.id)) {
            throw new EngineError('cue-number-taken', `Cue number already used: ${number}`);
        }
        return saveCue({
            ...cue,
            number,
            scene: requireSceneId(requireString(input, 'scene')),
            note: requireString(input, 'note').slice(0, CUE_NOTE_MAX_LENGTH),
            fadeIn: optionalSeconds(input, 'fadeIn'),
            fadeOut: optionalSeconds(input, 'fadeOut'),
            follow: optionalSeconds(input, 'follow')
        });
    });

    router.register('cues.delete', (params) => {
        const id = requireCue(requireString(requireObject(params), 'id')).id;
        update((memories) => ({ ...memories, cues: memories.cues.filter((item) => item.id !== id) }));
        return undefined;
    });

    const action = (run: () => void) => () => {
        if (session.summary() === null) {
            throw new EngineError('no-show', 'No show open');
        }
        run();
        return stack.state();
    };
    router.register('cues.go', action(() => stack.go()));
    router.register('cues.back', action(() => stack.back()));
    router.register('cues.pause', action(() => stack.pause()));
    router.register('cues.release', action(() => stack.release()));
    router.register('cues.setNext', (params) => {
        stack.setNext(requireCue(requireString(requireObject(params), 'id')).id);
        return stack.state();
    });
}
