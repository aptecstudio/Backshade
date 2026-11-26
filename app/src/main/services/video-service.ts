/**
 * video.* methods: the video outputs of the open show (configuration saved
 * in the show, video.changed) and their layers in program and preview
 * (running session, video.stateChanged), shown by the output windows.
 */

import { randomUUID } from 'node:crypto';
import { MAX_VIDEO_LAYERS, MAX_VIDEO_OUTPUTS, normalizeLayer, type ShowVideo, type VideoInput, type VideoOutputConfig } from '../../shared/video/video';
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
    const engine = new VideoEngine(videoOf, (compositions) => bus.emit('video.stateChanged', { compositions }));

    session.onContentChange((part) => {
        if (part === 'all') {
            engine.reset();
            engine.sync();
            bus.emit('video.changed', {});
        } else if (part === 'video') {
            engine.sync();
            bus.emit('video.changed', {});
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
            x: 0, y: 0, width: 1280, height: 720, stack: session.video().outputs.length, layers: 3
        };
        const output = outputData(input, base);
        return update((video) => ({ outputs: [...video.outputs, output] }));
    });

    router.register('video.updateOutput', (params) => {
        const input = requireObject(params);
        const id = requireString(input, 'id');
        const current = session.video().outputs.find((output) => output.id === id);
        if (current === undefined) {
            throw new EngineError('video-output-not-found', `Video output not found: ${id}`);
        }
        const output = outputData(input, current);
        return update((video) => ({ outputs: video.outputs.map((item) => item.id === id ? output : item) }));
    });

    router.register('video.removeOutput', (params) => {
        const id = requireString(requireObject(params), 'id');
        return update((video) => ({ outputs: video.outputs.filter((output) => output.id !== id) }));
    });

    router.register('video.setLayer', (params) => {
        const input = requireObject(params);
        engine.setLayer(requireString(input, 'output'), requireChoice(input, 'target', ['program', 'preview'] as const), requireInteger(input, 'index'), normalizeLayer(input.layer));
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
