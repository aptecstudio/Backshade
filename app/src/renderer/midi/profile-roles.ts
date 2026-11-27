/**
 * Roles of the controller profiles resolved in the open show: a scene or
 * chaser place gives the scene or chaser recorded there, a group number the
 * group in patch order; places and groups that do not exist give nothing.
 */

import type { MemoriesSummary } from '../../shared/console/memories.js';
import type { MidiTarget } from '../../shared/midi/midi.js';
import type { ProfileRole } from '../../shared/midi/midi-profiles.js';
import type { FixtureGroup } from '../../shared/patch/groups.js';

/** Target of a role in the show; null when the show has no such scene, chaser or group */
export function resolveRole(role: ProfileRole, memories: MemoriesSummary, groups: readonly FixtureGroup[]): MidiTarget | null {
    switch (role.kind) {
        case 'master': return { kind: 'master', master: role.master };
        case 'group': {
            const group = groups[role.index];
            return group === undefined ? null : { kind: 'group', id: group.id };
        }
        case 'scene': {
            const scene = memories.scenes.find((item) => item.slot === role.slot);
            return scene === undefined ? null : { kind: 'scene', id: scene.id };
        }
        case 'chaser': {
            const chaser = memories.chasers.find((item) => item.slot === role.slot);
            return chaser === undefined ? null : { kind: 'chaser', id: chaser.id };
        }
        case 'cue': return { kind: 'cue', action: role.action };
        case 'desk': return { kind: 'desk', action: role.action };
        case 'timeline': return { kind: 'timeline', action: role.action };
    }
}
