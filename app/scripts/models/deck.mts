/**
 * Stage decks.
 */

import { Obj } from './obj.mts';

/** Stage deck of 2 x 1 m with legs, top at the given height */
export function deck(height: number): Obj {
    const obj = new Obj();
    obj.object('deck');
    obj.material('floor');
    obj.box([0, height - 0.03, 0], [2, 0.06, 1]);
    obj.material('aluminium');
    obj.box([0, height - 0.07, 0.48], [2, 0.04, 0.04]);
    obj.box([0, height - 0.07, -0.48], [2, 0.04, 0.04]);
    for (const x of [-0.95, 0.95]) {
        for (const z of [-0.45, 0.45]) {
            obj.tube([x, 0, z], [x, height - 0.06, z], 0.025, 8);
        }
    }
    return obj;
}
