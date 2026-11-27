/**
 * Fixture models: the parts that move are separate objects.
 */

import { Obj } from './obj.mts';

/** Moving head: base, yoke (turns for pan) and head (turns for tilt), lens up */
export function movingHead(): Obj {
    const obj = new Obj();
    obj.object('base');
    obj.material('body');
    obj.box([0, 0.08, 0], [0.34, 0.16, 0.34]);
    obj.material('panel');
    obj.box([0, 0.08, 0.171], [0.14, 0.07, 0.004]);
    obj.object('yoke');
    obj.material('body');
    obj.tube([0, 0.16, 0], [0, 0.19, 0], 0.09);
    obj.box([0, 0.215, 0], [0.4, 0.05, 0.14]);
    obj.box([-0.175, 0.35, 0], [0.05, 0.27, 0.12]);
    obj.box([0.175, 0.35, 0], [0.05, 0.27, 0.12]);
    obj.object('head');
    obj.material('body');
    obj.tube([0, 0.34, 0], [0, 0.58, 0], 0.12, 16);
    obj.tube([0, 0.27, 0], [0, 0.34, 0], 0.08, 16, 0.12);
    obj.tube([-0.15, 0.4, 0], [0.15, 0.4, 0], 0.035, 10);
    obj.material('lens');
    obj.tube([0, 0.58, 0], [0, 0.592, 0], 0.095, 16);
    return obj;
}

/** PAR can with its bracket, lens towards the front */
export function par(): Obj {
    const obj = new Obj();
    obj.object('par');
    obj.material('body');
    obj.box([0, 0.01, 0], [0.26, 0.02, 0.06]);
    obj.box([-0.125, 0.11, 0], [0.012, 0.2, 0.04]);
    obj.box([0.125, 0.11, 0], [0.012, 0.2, 0.04]);
    obj.tube([0, 0.18, -0.1], [0, 0.18, 0.08], 0.11, 16);
    obj.tube([0, 0.18, -0.14], [0, 0.18, -0.1], 0.06, 12, 0.11);
    obj.material('lens');
    obj.tube([0, 0.18, 0.08], [0, 0.18, 0.09], 0.092, 16);
    return obj;
}
