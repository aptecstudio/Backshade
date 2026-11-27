/**
 * console.* methods of the group faders: the intensity level of each
 * fixture group. Levels belong to the running session, like the faders of a
 * desk; every window follows console.groupLevelsChanged.
 */

import { GroupLevels } from '../console/group-levels';
import type { PresetDesk } from '../console/preset-desk';
import type { OutputEngine } from '../output/output-engine';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireBoolean, requireNumber, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/** Level of a group set by the engine (timeline automation) */
export type GroupLevelSetter = (id: string, level: number) => void;

/** Levels of the groups for the rest of the engine: set (timeline automation) and read (timeline recorder) */
export interface GroupLevelAccess {
    set: GroupLevelSetter;
    get: () => Record<string, number>;
}

/**
 * Registers the methods of the service.
 * @returns the access to the levels of the groups, for the timelines
 */
export function registerGroupService(router: RequestRouter, bus: EventBus, session: ShowSession, output: OutputEngine, desk: PresetDesk): GroupLevelAccess {
    const groups = new GroupLevels(output.mixer, () => session.summary() === null ? null : session.patch(), (universe) => output.universeMap(universe));
    const announce = (): void => bus.emit('console.groupLevelsChanged', { levels: groups.get() });
    session.onContentChange((part) => {
        if (part === 'all') {
            groups.clear();
            announce();
        } else if (part === 'patch') {
            groups.refresh();
            announce();
        }
    });
    // Home brings every fader of the desk back to zero, group faders included
    desk.onHome(() => {
        groups.clear();
        announce();
    });

    router.register('console.getGroupLevels', () => groups.get());

    const existing = (input: Record<string, unknown>): string => {
        const id = requireString(input, 'id');
        if (session.summary() === null || !session.patch().groups.some((group) => group.id === id)) {
            throw new EngineError('group-not-found', `Group not found: ${id}`);
        }
        return id;
    };

    router.register('console.flashGroup', (params) => {
        const input = requireObject(params);
        groups.flash(existing(input), requireBoolean(input, 'on'));
        announce();
        return undefined;
    });

    router.register('console.setGroupLevel', (params) => {
        const input = requireObject(params);
        const id = existing(input);
        groups.set(id, requireNumber(input, 'level'));
        announce();
        return undefined;
    });

    return {
        set: (id, level) => {
            if (session.summary() !== null && session.patch().groups.some((group) => group.id === id)) {
                groups.set(id, level);
                announce();
            }
        },
        get: () => groups.get()
    };
}
