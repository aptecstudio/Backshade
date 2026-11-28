/**
 * Concert harp in the plane X = 0 of its centre: the soundbox leans on the
 * player, at the back, and the column stands at the front.
 */

import type { Obj } from './obj.mts';
import type { Vector } from './vector.mts';

export function harp(obj: Obj, x: number): void {
    const at = (y: number, z: number): Vector => [x, y, z];
    const low = at(0.12, 0.82);
    const high = at(1.28, 0.14);
    obj.material('wood');
    // Pedestal, soundbox widening towards the floor and column
    obj.box([x, 0.05, 0.84], [0.24, 0.1, 0.46]);
    obj.loft([{ at: low, width: 0.11, depth: 0.085 }, { at: at(0.7, 0.48), width: 0.075, depth: 0.06 }, { at: high, width: 0.032, depth: 0.03 }], 14, 4);
    obj.material('brass');
    obj.tube(at(0.1, 1.02), at(1.7, 1.02), 0.035, 14);
    obj.ball(at(1.74, 1.02), 0.052, 14, 10);
    // The curved neck, from the top of the soundbox to the top of the column
    obj.material('wood');
    const neck: Vector[] = [high, at(1.42, 0.3), at(1.43, 0.52), at(1.5, 0.76), at(1.68, 1.02)];
    obj.loft(neck.map((point) => ({ at: point, width: 0.028, depth: 0.042 })), 12, 5);
    obj.material('keys');
    const underNeck = (z: number): number => {
        const next = neck.findIndex((point) => point[2] >= z);
        const [a, b] = [neck[Math.max(0, next - 1)], neck[Math.max(0, next)]];
        const t = b[2] === a[2] ? 0 : (z - a[2]) / (b[2] - a[2]);
        return a[1] + (b[1] - a[1]) * t - 0.035;
    };
    for (let string = 1; string <= 22; string++) {
        const z = 0.18 + string * 0.027;
        // Foot of the string on the soundbox, which falls towards the column
        const foot = high[1] + (low[1] - high[1]) * ((z - high[2]) / (low[2] - high[2]));
        obj.tube(at(foot + 0.03, z), at(underNeck(z), z), 0.0032, 4);
    }
}
