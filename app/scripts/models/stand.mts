/**
 * Wind-up lighting stand with its crank, in the manner of the large steel
 * ones: three sections, the two risers are separate parts that slide up.
 * Built at its lowest, with the top at WINDUP.min.
 */

import { Obj } from './obj.mts';
import type { Vector } from './vector.mts';

/** Lowest and highest height of the top, in meters */
export const WINDUP = { min: 1.67, max: 3.7 } as const;

export function windupStand(): Obj {
    const obj = new Obj();
    obj.object('base');
    obj.material('aluminium');
    // Three legs spanning 128 cm, with their braces to a collar on the column
    for (let leg = 0; leg < 3; leg++) {
        const angle = (leg / 3) * Math.PI * 2;
        const foot: Vector = [Math.sin(angle) * 0.64, 0.02, Math.cos(angle) * 0.64];
        obj.tube([0, 0.48, 0], foot, 0.016, 10);
        obj.tube([0, 0.14, 0], [foot[0] * 0.55, 0.22, foot[2] * 0.55], 0.01, 8);
        obj.material('shoes');
        obj.tube([foot[0], 0, foot[2]], [foot[0], 0.03, foot[2]], 0.035, 12);
        obj.material('aluminium');
    }
    obj.tube([0, 0.1, 0], [0, 1.58, 0], 0.0275, 16);
    obj.material('body');
    for (const y of [0.14, 0.48, 1.58]) {
        obj.tube([0, y - 0.03, 0], [0, y + 0.03, 0], 0.045, 16);
    }
    // Winch with its crank
    obj.box([0.06, 1.0, 0], [0.09, 0.14, 0.07]);
    obj.material('aluminium');
    obj.tube([0.1, 1.0, 0], [0.16, 1.0, 0], 0.012, 8);
    obj.tube([0.155, 1.0, 0], [0.155, 0.91, 0.04], 0.01, 8);
    obj.material('shoes');
    obj.tube([0.155, 0.91, 0.04], [0.215, 0.91, 0.04], 0.016, 10);
    obj.object('riser1');
    obj.material('aluminium');
    obj.tube([0, 0.4, 0], [0, 1.63, 0], 0.0225, 14);
    obj.material('body');
    obj.tube([0, 1.6, 0], [0, 1.64, 0], 0.036, 14);
    obj.object('riser2');
    obj.material('aluminium');
    obj.tube([0, 0.45, 0], [0, WINDUP.min - 0.02, 0], 0.019, 14);
    obj.material('body');
    obj.tube([0, WINDUP.min - 0.04, 0], [0, WINDUP.min, 0], 0.05, 16);
    return obj;
}
