/**
 * Actions of the MIDI targets, run by the engine through the same methods
 * the interface uses (the router), so every window follows and the access
 * of the operator is checked. Keys act on press (momentary targets also on
 * release); levels set masters, groups, scenes, chasers and DMX channels.
 * The current level of a target is read for the pickup of faders without
 * motors and for the feedback, with the on state of keys (LEDs). MIDI Show
 * Control commands act on the cue list.
 */

import type { WidgetLink } from '../../shared/grid/grid';
import type { MidiTarget } from '../../shared/midi/midi';
import type { EngineMethod, EngineMethods } from '../../shared/transport/engine-api';
import type { RequestRouter } from '../transport/request-router';
import type { MscCommand } from './midi-parse';

export class MidiActions {
    private readonly router: RequestRouter;
    /** Level of a group before its key was held, to restore it */
    private readonly flashed = new Map<string, number>();
    /** Answers of the reading methods during a batch (one round of feedback) */
    private cache: Map<string, Promise<unknown>> | null = null;

    constructor(router: RequestRouter) {
        this.router = router;
    }

    /**
     * Press or release of a key.
     */
    async press(target: MidiTarget, down: boolean): Promise<void> {
        if (target.kind === 'timeline') {
            if (down) {
                await this.call('timeline.transport', { action: target.action });
            }
            return;
        }
        await this.pressLink(target, down);
    }

    /**
     * Level of a fader or knob, 0 to 1.
     */
    async setLevel(target: MidiTarget, level: number): Promise<void> {
        switch (target.kind) {
            case 'scene':
            case 'chaser':
                await this.call('memories.setLevel', { kind: target.kind, id: target.id, level });
                break;
            case 'master':
                if (target.master === 'grand') {
                    await this.call('output.setGrandMaster', { level });
                } else {
                    await this.call('console.setMaster', { master: target.master, position: level });
                }
                break;
            case 'group':
                await this.call('console.setGroupLevel', { id: target.id, level });
                break;
            case 'channel':
                await this.call('console.setFader', { row: 'a', universe: target.universe, channel: target.channel, value: Math.round(level * 255) });
                break;
            default:
                // Keys moved by a fader: pressed above the middle
                await this.press(target, level >= 0.5);
        }
    }

    /**
     * Current level of a target, for the pickup; null when it has none.
     */
    async level(target: MidiTarget): Promise<number | null> {
        switch (target.kind) {
            case 'master':
                if (target.master === 'grand') {
                    return (await this.call('output.getState')).grandMaster;
                }
                return (await this.call('console.getState')).masters[target.master];
            case 'group':
                return (await this.call('console.getGroupLevels'))[target.id] ?? 0;
            case 'channel':
                return ((await this.call('console.getLevels', { universe: target.universe })).a[target.channel - 1] ?? 0) / 255;
            case 'scene':
            case 'chaser': {
                const active = (await this.call('memories.getState')).active.find((item) => item.id === target.id);
                return active === undefined ? 0 : active.level ?? 1;
            }
            default:
                return null;
        }
    }

    /**
     * On state of a key target, for its LED; null when it has none (cue keys).
     */
    async active(target: MidiTarget): Promise<boolean | null> {
        switch (target.kind) {
            case 'scene':
            case 'chaser':
                return (await this.call('memories.getState')).active.some((item) => item.id === target.id);
            case 'desk':
                if (target.action === 'blackout') {
                    return (await this.call('output.getState')).blackout;
                }
                if (target.action === 'home') {
                    return null;
                }
                return (await this.call('console.getState'))[target.action];
            case 'timeline': {
                const state = await this.call('timeline.getState');
                return target.action === 'toggle' ? state.playing : target.action === 'stop' ? null : state.goMode && !state.playing;
            }
            case 'audio': {
                const state = await this.call('audio.getState');
                if (target.action === 'play') {
                    return state.item !== null && !state.paused;
                }
                return target.action === 'pause' ? state.paused : null;
            }
            case 'timer':
                return (await this.call('video.getTimers'))[target.id]?.running ?? false;
            case 'group':
            case 'channel':
            case 'master': {
                const level = await this.level(target);
                return level === null ? null : level > 0;
            }
            case 'cue':
            case 'none':
                return null;
        }
    }

    /**
     * MIDI Show Control: Go (to a cue number when given), Stop (pause),
     * Resume (go on after a pause), Reset (release).
     */
    async msc(command: MscCommand, cue: string | null): Promise<void> {
        const state = await this.call('cues.getState');
        switch (command) {
            case 'go': {
                if (cue !== null) {
                    const target = (await this.call('memories.get')).cues.find((item) => Math.abs(item.number - Number(cue)) < 0.001);
                    if (target === undefined) {
                        return;
                    }
                    await this.call('cues.setNext', { id: target.id });
                }
                await this.call('cues.go', undefined);
                break;
            }
            case 'stop':
                if (!state.paused) {
                    await this.call('cues.pause', undefined);
                }
                break;
            case 'resume':
                if (state.paused) {
                    await this.call('cues.go', undefined);
                }
                break;
            case 'reset':
                await this.call('cues.release', undefined);
                break;
        }
    }

    private async pressLink(link: WidgetLink, down: boolean): Promise<void> {
        switch (link.kind) {
            case 'scene':
            case 'chaser':
                if (down) {
                    const active = (await this.call('memories.getState')).active.some((item) => item.id === link.id);
                    await this.call('memories.setActive', { kind: link.kind, id: link.id, on: !active });
                }
                break;
            case 'cue':
                if (down) {
                    await this.call(`cues.${link.action}`, undefined);
                }
                break;
            case 'group':
                if (down) {
                    this.flashed.set(link.id, (await this.call('console.getGroupLevels'))[link.id] ?? 0);
                    await this.call('console.setGroupLevel', { id: link.id, level: 1 });
                } else {
                    await this.call('console.setGroupLevel', { id: link.id, level: this.flashed.get(link.id) ?? 0 });
                    this.flashed.delete(link.id);
                }
                break;
            case 'channel':
                await this.call('console.setFlash', { row: 'a', universe: link.universe, channel: link.channel, on: down });
                break;
            case 'desk':
                if (!down) {
                    break;
                }
                if (link.action === 'blackout') {
                    await this.call('output.setBlackout', { on: !(await this.call('output.getState')).blackout });
                } else if (link.action === 'fullOn') {
                    await this.call('console.setFullOn', { on: !(await this.call('console.getState')).fullOn });
                } else if (link.action === 'blind') {
                    await this.call('console.setBlind', { on: !(await this.call('console.getState')).blind });
                } else {
                    await this.call('console.home', undefined);
                }
                break;
            case 'audio':
                if (down) {
                    await this.call(`audio.${link.action}`, undefined);
                }
                break;
            case 'timer':
                if (down) {
                    await this.call('video.timerCommand', { id: link.id, action: link.action });
                }
                break;
            case 'master':
            case 'none':
                break;
        }
    }

    /**
     * Runs a function reading the state once per method: the feedback of
     * many mappings reads each state one time.
     */
    async batch<T>(run: () => Promise<T>): Promise<T> {
        this.cache = new Map();
        try {
            return await run();
        } finally {
            this.cache = null;
        }
    }

    /**
     * Runs a method of the engine like a request of the interface.
     */
    private async call<M extends EngineMethod>(method: M, ...params: EngineMethods[M]['params'] extends undefined ? [] | [undefined] : [EngineMethods[M]['params']]): Promise<EngineMethods[M]['result']> {
        const reading = method.includes('.get');
        const key = `${method} ${JSON.stringify(params[0] ?? null)}`;
        const cached = reading ? this.cache?.get(key) : undefined;
        if (cached !== undefined) {
            return cached as Promise<EngineMethods[M]['result']>;
        }
        const result = this.router.handle({ type: 'request', id: 0, method, params: params[0] }, { transport: 'ipc' }).then((response) => {
            if (!response.ok) {
                throw new Error(`${response.error.code}: ${response.error.message}`);
            }
            return response.result as EngineMethods[M]['result'];
        });
        if (reading) {
            this.cache?.set(key, result);
        }
        return result;
    }
}
