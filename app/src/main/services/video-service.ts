/**
 * video.* methods: the video outputs of the open show (configuration saved
 * in the show, video.changed) and their layers in program and preview
 * (running session, video.stateChanged), shown by the output windows.
 */

import { randomUUID } from 'node:crypto';
import { noBlend } from '../../shared/video/blend';
import { MAX_PRESETS, normalizeMapping, normalizePreset, type MappingPreset } from '../../shared/video/mapping-preset';
import { MAX_VIDEO_LAYERS, MAX_VIDEO_OUTPUTS, normalizeLayer, type ShowVideo, type VideoInput, type VideoOutputConfig } from '../../shared/video/video';
import { MAX_TIMERS, normalizeTimer, TIMER_ACTIONS, type TimerState } from '../../shared/video/show-timer';
import { MAX_GOBOS, normalizeGobo } from '../../shared/video/text-gobo';
import { TimerClock } from '../video/timer-clock';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { optionalString, requireChoice, requireInteger, requireNumber, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import { listDisplays } from '../video/output-window';
import { VideoEngine } from '../video/video-engine';

/**
 * Registers the methods of the service.
 * @returns the video engine, also used by the scenes and cues
 */
export function registerVideoService(router: RequestRouter, bus: EventBus, session: ShowSession, inputs: () => Promise<VideoInput[]>): VideoEngine {
    const videoOf = (): ShowVideo | null => session.summary() === null ? null : session.video();
    const clock = new TimerClock();
    const engine = new VideoEngine(videoOf, (compositions) => bus.emit('video.stateChanged', { compositions }), () => clock.snapshot());
    const timersChanged = (): Record<string, TimerState> => {
        const states = clock.snapshot();
        bus.emit('video.timersChanged', { states });
        engine.refresh();
        return states;
    };

    session.onContentChange((part) => {
        if (part === 'all') {
            clock.clear();
            engine.reset();
            engine.sync();
            bus.emit('video.changed', {});
        } else if (part === 'video') {
            clock.keep(new Set(session.video().timers.map((timer) => timer.id)));
            engine.sync();
            engine.refresh();
            bus.emit('video.changed', {});
        }
    });

    // Live data of the dynamic texts: current cue and song playing
    let cueId: string | null = null;
    let songId: string | null = null;
    const updateContext = (): void => {
        if (session.summary() === null) {
            engine.setContext({ cue: '', song: '' });
            return;
        }
        const memories = session.memories();
        const cue = memories.cues.find((item) => item.id === cueId);
        const scene = memories.scenes.find((item) => item.id === cue?.scene);
        engine.setContext({
            cue: cue === undefined ? '' : cue.note !== '' ? cue.note : scene?.name ?? '',
            song: session.audio().items.find((item) => item.id === songId)?.name ?? ''
        });
    };
    bus.addSink((message) => {
        if (message.event === 'cues.stateChanged') {
            cueId = (message.payload as { state: { current: string | null } }).state.current;
            updateContext();
        } else if (message.event === 'audio.stateChanged') {
            songId = (message.payload as { state: { item: string | null } }).state.item;
            updateContext();
        } else if (message.event === 'memories.changed' || message.event === 'audio.changed') {
            updateContext();
        }
    });

    const update = (change: (video: ShowVideo) => ShowVideo): ShowVideo => {
        session.setVideo(change(session.video()));
        return session.video();
    };
    const outputData = (input: Record<string, unknown>, current: VideoOutputConfig): VideoOutputConfig => {
        const value = (field: keyof VideoOutputConfig, min: number, max: number): number => {
            if (input[field] === undefined) {
                return current[field] as number;
            }
            const number = requireInteger(input, field);
            if (number < min || number > max) {
                throw new EngineError('invalid-params', `Invalid field "${field}"`);
            }
            return number;
        };
        const name = optionalString(input, 'name');
        return {
            ...current,
            name: name === undefined ? current.name : name.trim().slice(0, 60) || current.name,
            enabled: typeof input.enabled === 'boolean' ? input.enabled : current.enabled,
            display: optionalString(input, 'display') ?? current.display,
            fullscreen: typeof input.fullscreen === 'boolean' ? input.fullscreen : current.fullscreen,
            x: value('x', 0, 16384),
            y: value('y', 0, 16384),
            width: value('width', 64, 16384),
            height: value('height', 64, 16384),
            stack: value('stack', 0, 99),
            layers: value('layers', 1, MAX_VIDEO_LAYERS)
        };
    };

    router.register('video.get', () => session.video());
    router.register('video.getState', () => engine.compositions());
    router.register('video.listDisplays', () => listDisplays());
    router.register('video.listInputs', () => inputs());

    router.register('video.addOutput', (params) => {
        const input = requireObject(params);
        if (session.video().outputs.length >= MAX_VIDEO_OUTPUTS) {
            throw new EngineError('too-many-outputs', 'No more video outputs');
        }
        const base: VideoOutputConfig = {
            id: randomUUID(), name: requireString(input, 'name'), enabled: false, display: '', fullscreen: true,
            x: 0, y: 0, width: 1280, height: 720, stack: session.video().outputs.length, layers: 3, surfaces: [], masks: [], blend: noBlend(), presets: []
        };
        const output = outputData(input, base);
        return update((video) => ({ ...video, outputs: [...video.outputs, output] }));
    });

    router.register('video.updateOutput', (params) => {
        const input = requireObject(params);
        const id = requireString(input, 'id');
        const current = session.video().outputs.find((output) => output.id === id);
        if (current === undefined) {
            throw new EngineError('video-output-not-found', `Video output not found: ${id}`);
        }
        const output = outputData(input, current);
        return update((video) => ({ ...video, outputs: video.outputs.map((item) => item.id === id ? output : item) }));
    });

    const knownOutput = (id: string): VideoOutputConfig => {
        const output = session.video().outputs.find((item) => item.id === id);
        if (output === undefined) {
            throw new EngineError('video-output-not-found', `Video output not found: ${id}`);
        }
        return output;
    };

    const setPresets = (id: string, change: (presets: MappingPreset[]) => MappingPreset[]): void => {
        update((video) => ({ ...video, outputs: video.outputs.map((item) => item.id === id ? { ...item, presets: change(item.presets) } : item) }));
    };

    router.register('video.getMapping', (params) => engine.mapping(knownOutput(requireString(requireObject(params), 'id'))));

    router.register('video.setMapping', (params) => {
        const input = requireObject(params);
        const { id } = knownOutput(requireString(input, 'id'));
        const mapping = normalizeMapping(input.mapping);
        engine.clearMapping(id);
        update((video) => ({ ...video, outputs: video.outputs.map((item) => item.id === id ? { ...item, ...mapping } : item) }));
        return undefined;
    });

    router.register('video.savePreset', (params) => {
        const input = requireObject(params);
        const output = knownOutput(requireString(input, 'id'));
        const preset = normalizePreset(input.preset);
        if (preset === null) {
            throw new EngineError('invalid-params', 'Invalid mapping preset');
        }
        const exists = output.presets.some((item) => item.id === preset.id);
        if (!exists && output.presets.length >= MAX_PRESETS) {
            throw new EngineError('invalid-params', 'No more mapping presets');
        }
        setPresets(output.id, (presets) => exists ? presets.map((item) => item.id === preset.id ? preset : item) : [...presets, preset]);
        return undefined;
    });

    router.register('video.deletePreset', (params) => {
        const input = requireObject(params);
        const { id } = knownOutput(requireString(input, 'id'));
        const preset = requireString(input, 'preset');
        setPresets(id, (presets) => presets.filter((item) => item.id !== preset));
        return undefined;
    });

    router.register('video.recallPreset', (params) => {
        const input = requireObject(params);
        const { id } = knownOutput(requireString(input, 'id'));
        engine.recallMapping(id, requireString(input, 'preset'));
        return undefined;
    });

    router.register('video.setTestPattern', (params) => {
        const input = requireObject(params);
        engine.setTestPattern(knownOutput(requireString(input, 'id')).id, input.on === true);
        return undefined;
    });

    router.register('video.getTestPatterns', () => engine.testPatterns());

    router.register('video.removeOutput', (params) => {
        const id = requireString(requireObject(params), 'id');
        return update((video) => ({ ...video, outputs: video.outputs.filter((output) => output.id !== id) }));
    });

    router.register('video.saveGobo', (params) => {
        const input = requireObject(params);
        const gobo = normalizeGobo(input.gobo);
        if (gobo === null) {
            throw new EngineError('invalid-params', 'Invalid text gobo');
        }
        return update((video) => {
            const exists = video.gobos.some((item) => item.id === gobo.id);
            if (!exists && video.gobos.length >= MAX_GOBOS) {
                throw new EngineError('too-many-gobos', 'No more text gobos');
            }
            return { ...video, gobos: exists ? video.gobos.map((item) => item.id === gobo.id ? gobo : item) : [...video.gobos, gobo] };
        });
    });

    router.register('video.deleteGobo', (params) => {
        const id = requireString(requireObject(params), 'id');
        return update((video) => ({ ...video, gobos: video.gobos.filter((item) => item.id !== id) }));
    });

    router.register('video.saveTimer', (params) => {
        const timer = normalizeTimer(requireObject(params).timer);
        if (timer === null) {
            throw new EngineError('invalid-params', 'Invalid timer');
        }
        return update((video) => {
            const exists = video.timers.some((item) => item.id === timer.id);
            if (!exists && video.timers.length >= MAX_TIMERS) {
                throw new EngineError('too-many-timers', 'No more timers');
            }
            return { ...video, timers: exists ? video.timers.map((item) => item.id === timer.id ? timer : item) : [...video.timers, timer] };
        });
    });

    router.register('video.deleteTimer', (params) => {
        const id = requireString(requireObject(params), 'id');
        return update((video) => ({ ...video, timers: video.timers.filter((item) => item.id !== id) }));
    });

    router.register('video.getTimers', () => clock.snapshot());

    router.register('video.timerCommand', (params) => {
        const input = requireObject(params);
        const id = requireString(input, 'id');
        if (!session.video().timers.some((timer) => timer.id === id)) {
            throw new EngineError('timer-not-found', `Timer not found: ${id}`);
        }
        clock.command(id, requireChoice(input, 'action', TIMER_ACTIONS));
        return timersChanged();
    });

    router.register('video.setLayer', (params) => {
        const input = requireObject(params);
        engine.setLayer(requireString(input, 'output'), requireChoice(input, 'target', ['program', 'preview'] as const), requireInteger(input, 'index'), normalizeLayer(input.layer));
        return undefined;
    });

    router.register('video.moveLayer', (params) => {
        const input = requireObject(params);
        engine.moveLayer(requireString(input, 'output'), requireChoice(input, 'target', ['program', 'preview'] as const), requireInteger(input, 'from'), requireInteger(input, 'to'));
        return undefined;
    });

    router.register('video.take', (params) => {
        const input = requireObject(params);
        const duration = requireNumber(input, 'duration');
        if (duration < 0 || duration > 60) {
            throw new EngineError('invalid-params', 'Invalid field "duration"');
        }
        engine.take(optionalString(input, 'output') ?? null, duration);
        return undefined;
    });

    return engine;
}
