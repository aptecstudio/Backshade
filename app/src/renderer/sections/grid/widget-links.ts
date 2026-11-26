/**
 * What the widgets of the grid do with their link: names, levels for
 * faders and knobs, presses for keys, active states and monitor texts.
 * Every action goes to the engine; the widgets show what the engine sends back.
 */

import { formatDuration } from '../../../framework/ts/index.js';
import { formatCueNumber } from '../../../shared/console/memories.js';
import { IDLE_TIMER, timerDisplay } from '../../../shared/video/show-timer.js';
import type { WidgetLink } from '../../../shared/grid/grid.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { applyOutputState } from '../../output/output-store.js';
import { formatControlValue } from '../../preferences/control-values.js';
import { engine } from '../../transport/engine.js';
import type { GridStore } from './grid-store.js';

const report = (promise: Promise<unknown>): void => {
    void promise.catch(showError);
};

/**
 * Name of what a link controls, used when the widget has no label.
 */
export function linkName(link: WidgetLink, store: GridStore): string {
    switch (link.kind) {
        case 'scene': return store.memories.scenes.find((scene) => scene.id === link.id)?.name ?? t('grid.missing');
        case 'chaser': return store.memories.chasers.find((chaser) => chaser.id === link.id)?.name ?? t('grid.missing');
        case 'group': return store.groups.find((group) => group.id === link.id)?.name ?? t('grid.missing');
        case 'cue': return t(`grid.cueActions.${link.action}`);
        case 'master': return t(`grid.masters.${link.master}`);
        case 'desk': return t(`grid.deskActions.${link.action}`);
        case 'channel': return t('grid.channelName', { universe: link.universe, channel: link.channel });
        case 'audio': return t(`grid.audioActions.${link.action}`);
        case 'timer': return store.timers.find((timer) => timer.id === link.id)?.name ?? t('grid.missing');
        case 'none': return '';
    }
}

/**
 * Level of a link for faders and knobs, 0 to 1; null when the link has none.
 */
export function linkLevel(link: WidgetLink, store: GridStore): number | null {
    switch (link.kind) {
        case 'scene':
        case 'chaser': {
            const playing = store.playback.active.find((item) => item.id === link.id);
            return playing === undefined ? 0 : playing.level ?? 1;
        }
        case 'master':
            return link.master === 'grand' ? store.output?.grandMaster ?? 1 : store.desk?.masters[link.master] ?? 1;
        case 'group':
            return store.groupLevels[link.id] ?? 0;
        case 'channel':
            return store.channelLevel(link.universe, link.channel) / 255;
        default:
            return null;
    }
}

/**
 * Sets the level of a link from a fader or a knob, 0 to 1.
 */
export function setLinkLevel(link: WidgetLink, level: number): void {
    switch (link.kind) {
        case 'scene':
        case 'chaser':
            report(engine().request('memories.setLevel', { kind: link.kind, id: link.id, level }));
            break;
        case 'master':
            if (link.master === 'grand') {
                report(engine().request('output.setGrandMaster', { level }).then(applyOutputState));
            } else {
                report(engine().request('console.setMaster', { master: link.master, position: level }));
            }
            break;
        case 'group':
            report(engine().request('console.setGroupLevel', { id: link.id, level }));
            break;
        case 'channel':
            report(engine().request('console.setFader', { row: 'a', universe: link.universe, channel: link.channel, value: Math.round(level * 255) }));
            break;
        default:
            break;
    }
}

/**
 * The link is on: scene or chaser playing, current desk command, group or channel above zero.
 */
export function linkActive(link: WidgetLink, store: GridStore): boolean {
    switch (link.kind) {
        case 'scene':
        case 'chaser':
            return store.playback.active.some((item) => item.id === link.id);
        case 'desk':
            return link.action === 'blackout' ? store.output?.blackout === true
                : link.action === 'fullOn' ? store.desk?.fullOn === true
                    : link.action === 'blind' ? store.desk?.blind === true : false;
        case 'cue':
            return link.action === 'pause' && store.cues.paused;
        case 'timer':
            return (link.action === 'toggle' || link.action === 'start') && store.timerStates[link.id]?.running === true;
        case 'audio':
            return link.action === 'pause' ? store.audioPlayback.paused : link.action === 'play' && store.audioPlayback.item !== null && !store.audioPlayback.paused;
        case 'group':
        case 'channel':
            return (linkLevel(link, store) ?? 0) > 0;
        default:
            return false;
    }
}

/** Keys that act while held (flash) instead of on press */
export function isMomentary(link: WidgetLink): boolean {
    return link.kind === 'group' || link.kind === 'channel';
}

// Level of a group before its flash key was pressed, to restore it
const flashed = new Map<string, number>();

/**
 * Press of a key; for momentary links also the release (down false).
 */
export function pressLink(link: WidgetLink, store: GridStore, down: boolean): void {
    switch (link.kind) {
        case 'scene':
        case 'chaser':
            if (down) {
                report(engine().request('memories.setActive', { kind: link.kind, id: link.id, on: !linkActive(link, store) }));
            }
            break;
        case 'cue':
            if (down) {
                report(engine().request(`cues.${link.action}`));
            }
            break;
        case 'group':
            if (down) {
                flashed.set(link.id, store.groupLevels[link.id] ?? 0);
                setLinkLevel(link, 1);
            } else {
                setLinkLevel(link, flashed.get(link.id) ?? 0);
                flashed.delete(link.id);
            }
            break;
        case 'channel':
            report(engine().request('console.setFlash', { row: 'a', universe: link.universe, channel: link.channel, on: down }));
            break;
        case 'desk':
            if (!down) {
                break;
            }
            if (link.action === 'blackout') {
                report(engine().request('output.setBlackout', { on: store.output?.blackout !== true }).then(applyOutputState));
            } else if (link.action === 'fullOn') {
                report(engine().request('console.setFullOn', { on: store.desk?.fullOn !== true }));
            } else if (link.action === 'blind') {
                report(engine().request('console.setBlind', { on: store.desk?.blind !== true }));
            } else {
                report(engine().request('console.home'));
            }
            break;
        case 'audio':
            if (down) {
                report(engine().request(`audio.${link.action}`));
            }
            break;
        case 'timer':
            if (down) {
                report(engine().request('video.timerCommand', { id: link.id, action: link.action }));
            }
            break;
        case 'none':
            break;
    }
}

/**
 * Text of a monitor widget.
 */
export function monitorText(link: WidgetLink, store: GridStore): string {
    const cueName = (id: string | null): string => {
        const cue = store.memories.cues.find((item) => item.id === id);
        if (cue === undefined) {
            return '-';
        }
        const scene = store.memories.scenes.find((item) => item.id === cue.scene);
        return `${formatCueNumber(cue.number)} ${cue.note !== '' ? cue.note : scene?.name ?? ''}`;
    };
    switch (link.kind) {
        case 'cue':
            return t('grid.monitorCue', { current: cueName(store.cues.current), next: cueName(store.cues.next) });
        case 'chaser': {
            const chaser = store.memories.chasers.find((item) => item.id === link.id);
            const playing = store.playback.active.find((item) => item.id === link.id);
            if (chaser === undefined) {
                return t('grid.missing');
            }
            return playing?.step === null || playing === undefined
                ? t('grid.monitorTempo', { bpm: chaser.bpm.toFixed(1) })
                : t('grid.monitorStep', { bpm: chaser.bpm.toFixed(1), step: playing.step + 1, count: chaser.steps.length });
        }
        case 'scene':
            return linkActive(link, store) ? formatControlValue('fader', linkLevel(link, store) ?? 0) : t('grid.off');
        case 'timer': {
            const timer = store.timers.find((item) => item.id === link.id);
            return timer === undefined ? t('grid.missing') : timerDisplay(timer, store.timerStates[link.id] ?? IDLE_TIMER, Date.now(), document.documentElement.lang).text;
        }
        case 'audio': {
            const playing = store.audioPlayback;
            const item = store.audio?.items.find((entry) => entry.id === playing.item);
            if (item === undefined) {
                return t('audio.stopped');
            }
            const end = item.end ?? playing.duration;
            return t('grid.monitorAudio', { name: item.name, remaining: formatDuration(Math.max(0, end - playing.position)) });
        }
        default: {
            const level = linkLevel(link, store);
            return level === null ? '' : formatControlValue('fader', level);
        }
    }
}
