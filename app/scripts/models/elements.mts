/**
 * Stage elements: monitors and amplifiers.
 */

import { Obj } from './obj.mts';
import type { Vector } from './vector.mts';

/** Floor wedge monitor, its sloped face towards the back of the stage (-Z) */
export function wedge(): Obj {
    const obj = new Obj();
    obj.object('wedge');
    obj.material('body');
    const w = 0.28;
    const a: Vector = [-w, 0, -0.2];
    const b: Vector = [w, 0, -0.2];
    const c: Vector = [w, 0.14, -0.2];
    const d: Vector = [-w, 0.14, -0.2];
    const e: Vector = [-w, 0, 0.2];
    const f: Vector = [w, 0, 0.2];
    const g: Vector = [w, 0.32, 0.02];
    const h: Vector = [-w, 0.32, 0.02];
    obj.face([d, c, b, a]);
    obj.face([h, g, c, d]);
    obj.face([g, h, e, f]);
    obj.face([e, h, d, a]);
    obj.face([c, g, f, b]);
    obj.face([a, b, f, e]);
    return obj;
}

/** Amplifier head on its cabinet */
export function amp(): Obj {
    const obj = new Obj();
    obj.object('amp');
    obj.material('body');
    obj.box([0, 0.39, 0], [0.76, 0.76, 0.36]);
    obj.box([0, 0.9, 0], [0.72, 0.24, 0.26]);
    obj.material('cloth');
    obj.box([0, 0.39, 0.182], [0.68, 0.68, 0.004]);
    obj.material('panel');
    obj.box([0, 0.9, 0.132], [0.62, 0.08, 0.004]);
    for (const x of [-0.3, 0.3]) {
        obj.tube([x, 0, 0], [x, 0.01, 0], 0.03, 8);
    }
    return obj;
}
