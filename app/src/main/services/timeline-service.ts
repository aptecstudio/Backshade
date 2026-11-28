/**
 * timeline.* methods: the timelines of the open show (saved in the show,
 * timeline.changed) and the transport of the player (running session,
 * timeline.stateChanged). The interface edits a copy of a timeline and
 * sends it whole; the engine checks it.
 */

import { randomUUID } from 'node:crypto';
import { newTimeline, normalizeTimeline, TIMELINE_LIMITS, type ShowTimelines, type Timeline } from '../../shared/timeline/timeline';
import type { MemoryPlayer } from '../console/memory-player';
import type { PresetDesk } from '../console/preset-desk';
import type { OutputEngine } from '../output/output-engine';
import type { PlaybackWindow } from '../playback/playback-window';
import type { ShowSession } from '../shows/show-session';
import { TimelineAudio } from '../timeline/timeline-audio';
import { TimelinePlayer } from '../timeline/timeline-player';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { optionalBoolean, requireBoolean, requireChoice, requireNumber, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import type { AudioEngine } from '../audio/audio-engine';
import type { VideoEngine } from '../video/video-engine';
import type { GroupLevelAccess } from './group-service';
import type { MixerRecaller } from './mixer-service';

const ACTIONS = ['play', 'pause', 'toggle', 'stop', 'locate', 'go', 'back'] as const;

/** Parts of the engine played by the timelines */
export interface TimelineTargets {
    memory: MemoryPlayer;
    video: VideoEngine;
    playback: PlaybackWindow;
    desk: PresetDesk;
    output: OutputEngine;
    groupLevels: GroupLevelAccess;
    /** Audio player, read by the recorder */
    audio: AudioEngine;
    /** External mixers, recalled by the mixer tracks */
    mixers: MixerRecaller;
}

/**
 * Registers the methods of the service.
 */
export function registerTimelineService(router: RequestRouter, bus: EventBus, session: ShowSession, targets: TimelineTargets): TimelinePlayer {
    const timelinesOf = (): ShowTimelines | null => session.summary() === null ? null : session.timelines();
    const player = new TimelinePlayer({
        timelines: timelinesOf,
        memory: targets.memory,
        video: targets.video,
        audio: new TimelineAudio(targets.playback),
        automation: {
            // The masters move in every window too
            master: (master, level) => {
                if (master === 'grand') {
                    targets.output.setGrandMaster(level);
                    bus.emit('output.stateChanged', { state: targets.output.state() });
                } else {
                    targets.desk.setMaster(master, level);
                    bus.emit('console.stateChanged', { state: targets.desk.getState() });
                }
            },
            group: (id, level) => targets.groupLevels.set(id, level),
            scene: (id, level) => targets.memory.setLevel('scene', id, level)
        },
        onState: (state) => bus.emit('timeline.stateChanged', { state }),
        live: {
            memories: () => targets.memory.livePlaybacks(),
            masters: () => ({ ...targets.desk.getState().masters, grand: targets.output.state().grandMaster }),
            groups: () => targets.groupLevels.get(),
            audio: () => targets.audio.voice(),
            programs: () => targets.video.programs()
        },
        // A recorded pass is saved like an edit of the timeline (an unsaved change of the show)
        onRecorded: (timeline) => {
            if (session.summary() !== null && session.timelines().timelines.some((item) => item.id === timeline.id)) {
                recorded = true;
                update((timelines) => timelines.map((item) => item.id === timeline.id ? timeline : item));
                recorded = false;
            }
        },
        newId: () => randomUUID(),
        recallMixer: (mixer, number) => targets.mixers.recall({ mixer, number }),
        recallMapping: (output, preset) => targets.video.recallMapping(output, preset)
    });
    let recorded = false;
    targets.memory.setClipTarget((id) => player.clipTarget(id));
    targets.memory.setTempoSource(() => player.tempo());

    session.onContentChange((part) => {
        if (part === 'all') {
            player.load(session.summary() === null ? null : session.timelines().timelines[0]?.id ?? null);
            bus.emit('timeline.changed', {});
        } else if (part === 'timelines') {
            player.timelinesChanged();
            bus.emit('timeline.changed', recorded ? { recorded: true } : {});
        }
    });

    const update = (change: (timelines: Timeline[]) => Timeline[]): ShowTimelines => {
        session.setTimelines({ timelines: change(session.timelines().timelines) });
        return session.timelines();
    };

    router.register('timeline.list', () => session.timelines());
    router.register('timeline.getState', () => player.state());

    router.register('timeline.create', (params) => {
        const name = requireString(requireObject(params), 'name').trim().slice(0, 60) || 'Timeline';
        if (session.timelines().timelines.length >= TIMELINE_LIMITS.timelines) {
            throw new EngineError('too-many-timelines', 'No more timelines');
        }
        const timeline = newTimeline(randomUUID(), name);
        const result = update((timelines) => [...timelines, timeline]);
        player.load(timeline.id);
        return result;
    });

    router.register('timeline.save', (params) => {
        const input = requireObject(params);
        const others = new Set<string>();
        const id = typeof (input.timeline as { id?: unknown } | undefined)?.id === 'string' ? (input.timeline as { id: string }).id : '';
        // Identifiers of the other timelines must stay unique
        for (const timeline of session.timelines().timelines) {
            if (timeline.id !== id) {
                others.add(timeline.id);
            }
        }
        const timeline = normalizeTimeline(input.timeline, others);
        if (timeline === null) {
            throw new EngineError('invalid-params', 'Invalid timeline');
        }
        return update((timelines) => timelines.some((item) => item.id === timeline.id)
            ? timelines.map((item) => item.id === timeline.id ? timeline : item)
            : [...timelines, timeline]);
    });

    router.register('timeline.delete', (params) => {
        const id = requireString(requireObject(params), 'id');
        return update((timelines) => timelines.filter((item) => item.id !== id));
    });

    router.register('timeline.load', (params) => {
        const id = requireString(requireObject(params), 'id');
        if (!session.timelines().timelines.some((item) => item.id === id)) {
            throw new EngineError('timeline-not-found', `Timeline not found: ${id}`);
        }
        player.load(id);
        return player.state();
    });

    router.register('timeline.transport', (params) => {
        const input = requireObject(params);
        const action = requireChoice(input, 'action', ACTIONS);
        switch (action) {
            case 'play': player.play(); break;
            case 'pause': player.pause(); break;
            case 'toggle': player.toggle(); break;
            case 'stop': player.stop(); break;
            case 'locate': player.locate(requireNumber(input, 'time')); break;
            case 'go': player.go(); break;
            case 'back': player.back(); break;
        }
        return player.state();
    });

    router.register('timeline.setOptions', (params) => {
        const input = requireObject(params);
        if (input.loop === null) {
            player.setLoop(null);
        } else if (input.loop !== undefined) {
            const loop = requireObject(input.loop);
            player.setLoop({ start: requireNumber(loop, 'start'), end: requireNumber(loop, 'end') });
        }
        const goMode = optionalBoolean(input, 'goMode');
        if (goMode !== undefined) {
            player.setGoMode(goMode);
        }
        return player.state();
    });

    router.register('timeline.setRecording', (params) => {
        player.setRecording(requireBoolean(requireObject(params), 'on'));
        return player.state();
    });

    return player;
}
