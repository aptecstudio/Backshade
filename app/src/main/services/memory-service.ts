/**
 * memories.* methods: scenes and chasers of the simple console. Scenes
 * are recorded from the result of the desk (preset faders and attributes
 * panel, after Masters A and B, and the live effects of the matrices;
 * scenes on excluded) and saved in the show;
 * playback state belongs to the running session. Every window follows
 * memories.changed (data) and memories.stateChanged (playback).
 */

import { randomUUID } from 'node:crypto';
import {
    BPM_LIMITS,
    CHASER_DIRECTIONS,
    CHASER_SLOTS,
    MAX_CHASER_STEPS,
    MEMORY_NAME_MAX_LENGTH,
    SCENE_SLOTS,
    sceneSummary,
    type Chaser,
    type MemoryKind,
    type Scene,
    type ShowMemories,
    type UniverseLevels
} from '../../shared/console/memories';
import { FADE_LIMITS } from '../../shared/show/show-settings';
import { MemoryPlayer } from '../console/memory-player';
import type { PresetDesk } from '../console/preset-desk';
import type { MatrixLive } from '../matrix/matrix-live';
import type { OutputEngine } from '../output/output-engine';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import {
    optionalBoolean,
    optionalString,
    requireChoice,
    requireNumber,
    requireObject,
    requireRange,
    requireString,
    requireStringArray
} from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

const KINDS: readonly MemoryKind[] = ['scene', 'chaser'];

function requireName(input: Record<string, unknown>): string {
    const name = requireString(input, 'name').trim();
    if (name === '' || name.length > MEMORY_NAME_MAX_LENGTH) {
        throw new EngineError('invalid-name', 'Invalid memory name');
    }
    return name;
}

function requireFade(input: Record<string, unknown>, field: string): number {
    const value = requireNumber(input, field);
    if (value < FADE_LIMITS.min || value > FADE_LIMITS.max) {
        throw new EngineError('invalid-params', `Invalid field "${field}"`);
    }
    return value;
}

function requireBpm(input: Record<string, unknown>): number {
    const bpm = requireNumber(input, 'bpm');
    if (bpm < BPM_LIMITS.min || bpm > BPM_LIMITS.max) {
        throw new EngineError('invalid-params', 'Invalid field "bpm"');
    }
    return Math.round(bpm * 10) / 10;
}

/**
 * Registers the methods of the service.
 * @returns the player, also used by the cue list
 */
export function registerMemoryService(router: RequestRouter, bus: EventBus, session: ShowSession, desk: PresetDesk, output: OutputEngine, live: MatrixLive): MemoryPlayer {
    const memoriesOf = (): ShowMemories | null => session.summary() === null ? null : session.memories();
    const player = new MemoryPlayer({
        mixer: output.mixer,
        mapOf: (universe) => output.universeMap(universe),
        memories: memoriesOf,
        matrices: () => session.summary() === null ? [] : session.patch().matrices,
        sceneMaster: () => desk.getState().masters.scene,
        onState: (state) => bus.emit('memories.stateChanged', { state })
    });

    session.onContentChange((part) => {
        if (part === 'all') {
            player.stopAll();
            bus.emit('memories.changed', {});
        } else if (part === 'memories') {
            player.memoriesChanged();
            bus.emit('memories.changed', {});
        }
    });

    const update = (change: (memories: ShowMemories) => ShowMemories): void => {
        session.setMemories(change(session.memories()));
    };
    const requireScene = (id: string): Scene => {
        const scene = session.memories().scenes.find((item) => item.id === id);
        if (scene === undefined) {
            throw new EngineError('memory-not-found', `Scene not found: ${id}`);
        }
        return scene;
    };
    const requireChaser = (id: string): Chaser => {
        const chaser = session.memories().chasers.find((item) => item.id === id);
        if (chaser === undefined) {
            throw new EngineError('memory-not-found', `Chaser not found: ${id}`);
        }
        return chaser;
    };
    const replaceChaser = (chaser: Chaser): Chaser => {
        update((memories) => ({ ...memories, chasers: [...memories.chasers.filter((item) => item.id !== chaser.id), chaser].sort((a, b) => a.slot - b.slot) }));
        return chaser;
    };

    router.register('memories.get', () => {
        const memories = session.memories();
        return { scenes: memories.scenes.map(sceneSummary), chasers: memories.chasers, cues: memories.cues };
    });

    router.register('memories.getState', () => player.state());

    router.register('memories.recordScene', (params) => {
        const input = requireObject(params);
        const slot = requireRange(input, 'slot', 1, SCENE_SLOTS);
        const name = requireName(input);
        const levels: UniverseLevels[] = [...desk.result()]
            .sort(([a], [b]) => a - b)
            .map(([universe, channels]) => ({ universe, channels: channels.map(([channel, value]) => [channel, Math.round(value)] as [number, number]) }));
        // Recording again on a place keeps the scene, so chasers using it follow
        const existing = session.memories().scenes.find((scene) => scene.slot === slot);
        const settings = session.settings();
        const scene: Scene = existing === undefined
            ? { id: randomUUID(), slot, name, fadeIn: settings.fadeInSeconds, fadeOut: settings.fadeOutSeconds, levels, matrices: live.effects() }
            : { ...existing, levels, matrices: live.effects() };
        update((memories) => ({ ...memories, scenes: [...memories.scenes.filter((item) => item.id !== scene.id), scene].sort((a, b) => a.slot - b.slot) }));
        return sceneSummary(scene);
    });

    router.register('memories.updateScene', (params) => {
        const input = requireObject(params);
        const scene: Scene = { ...requireScene(requireString(input, 'id')), name: requireName(input), fadeIn: requireFade(input, 'fadeIn'), fadeOut: requireFade(input, 'fadeOut') };
        update((memories) => ({ ...memories, scenes: memories.scenes.map((item) => item.id === scene.id ? scene : item) }));
        return sceneSummary(scene);
    });

    router.register('memories.deleteScene', (params) => {
        const id = requireScene(requireString(requireObject(params), 'id')).id;
        // The steps and cues that used the scene are removed
        update((memories) => ({
            scenes: memories.scenes.filter((item) => item.id !== id),
            chasers: memories.chasers.map((chaser) => chaser.steps.includes(id) ? { ...chaser, steps: chaser.steps.filter((step) => step !== id) } : chaser),
            cues: memories.cues.filter((cue) => cue.scene !== id)
        }));
        return undefined;
    });

    router.register('memories.saveChaser', (params) => {
        const input = requireObject(params);
        const id = optionalString(input, 'id');
        const slot = requireRange(input, 'slot', 1, CHASER_SLOTS);
        const steps = requireStringArray(input, 'steps');
        if (steps.length > MAX_CHASER_STEPS) {
            throw new EngineError('invalid-params', 'Too many steps');
        }
        steps.forEach(requireScene);
        const fade = requireNumber(input, 'fade');
        if (fade < 0 || fade > 1) {
            throw new EngineError('invalid-params', 'Invalid field "fade"');
        }
        const occupant = session.memories().chasers.find((chaser) => chaser.slot === slot);
        if (occupant !== undefined && occupant.id !== id) {
            throw new EngineError('slot-taken', `Chaser place already used: ${slot}`);
        }
        const chaser: Chaser = {
            id: id === undefined ? randomUUID() : requireChaser(id).id,
            slot,
            name: requireName(input),
            steps,
            bpm: requireBpm(input),
            fade,
            direction: requireChoice(input, 'direction', CHASER_DIRECTIONS)
        };
        replaceChaser(chaser);
        player.selectChaser(chaser.id);
        return chaser;
    });

    router.register('memories.deleteChaser', (params) => {
        const id = requireChaser(requireString(requireObject(params), 'id')).id;
        update((memories) => ({ ...memories, chasers: memories.chasers.filter((item) => item.id !== id) }));
        return undefined;
    });

    router.register('memories.setBpm', (params) => {
        const input = requireObject(params);
        const chaser = replaceChaser({ ...requireChaser(requireString(input, 'id')), bpm: requireBpm(input) });
        player.selectChaser(chaser.id);
        return chaser;
    });

    router.register('memories.setActive', (params) => {
        const input = requireObject(params);
        const kind = requireChoice(input, 'kind', KINDS);
        const id = requireString(input, 'id');
        if (kind === 'scene') {
            requireScene(id);
        } else {
            requireChaser(id);
        }
        player.setActive(kind, id, optionalBoolean(input, 'on') === true);
        return player.state();
    });

    router.register('memories.setLevel', (params) => {
        const input = requireObject(params);
        const kind = requireChoice(input, 'kind', KINDS);
        const id = requireString(input, 'id');
        if (kind === 'scene') {
            requireScene(id);
        } else {
            requireChaser(id);
        }
        player.setLevel(kind, id, requireNumber(input, 'level'));
        return undefined;
    });

    router.register('memories.selectChaser', (params) => {
        player.selectChaser(requireChaser(requireString(requireObject(params), 'id')).id);
        return player.state();
    });

    router.register('memories.releaseAll', () => {
        player.releaseAll();
        return player.state();
    });

    return player;
}
