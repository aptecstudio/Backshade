/**
 * Sets attributes (color, pan and tilt) of the fixtures of a group from
 * the widgets of the grid: the first fixture of the group is the
 * reference, as in the attributes panel, and the engine applies the values
 * to all of them.
 */

import type { AttributeLayout } from '../../../shared/console/fixture-attributes.js';
import type { FixtureAttribute } from '../../../shared/fixtures/fixture-definition.js';
import { showError } from '../../dialogs/show-error.js';
import { engine } from '../../transport/engine.js';
import type { GridStore } from './grid-store.js';

const layouts = new Map<string, Promise<AttributeLayout | null>>();

/**
 * Sends attribute values (0 to 1) to the fixtures of a group.
 */
export function setGroupAttributes(store: GridStore, groupId: string, values: Partial<Record<FixtureAttribute, number>>): void {
    const fixtures = store.groups.find((group) => group.id === groupId)?.fixtures ?? [];
    const reference = fixtures[0];
    if (reference === undefined) {
        return;
    }
    let layout = layouts.get(reference);
    if (layout === undefined) {
        layout = engine().request('console.attributeLayout', { fixture: reference }).catch(() => null);
        layouts.set(reference, layout);
    }
    void layout.then((found) => {
        if (found === null) {
            return;
        }
        const keyed: Record<string, number> = {};
        for (const [attribute, value] of Object.entries(values)) {
            const channel = found.channels.find((item) => item.attribute === attribute);
            if (channel !== undefined && value !== undefined) {
                keyed[channel.key] = value;
            }
        }
        if (Object.keys(keyed).length > 0) {
            return engine().request('console.setAttributes', { fixtures, values: keyed });
        }
        return undefined;
    }).catch(showError);
}

/**
 * Forgets the layouts, after a change of the patch.
 */
export function resetGroupLayouts(): void {
    layouts.clear();
}
