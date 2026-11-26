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
import { requireNumber, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Registers the methods of the service.
 */
export function registerGroupService(router: RequestRouter, bus: EventBus, session: ShowSession, output: OutputEngine, desk: PresetDesk): void {
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

    router.register('console.setGroupLevel', (params) => {
        const input = requireObject(params);
        const id = requireString(input, 'id');
        if (session.summary() === null || !session.patch().groups.some((group) => group.id === id)) {
            throw new EngineError('group-not-found', `Group not found: ${id}`);
        }
        groups.set(id, requireNumber(input, 'level'));
        announce();
        return undefined;
    });
}
