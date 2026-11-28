/**
 * Trumpet, trombone, saxophone and flute, held by a standing player whose
 * mouth is given.
 */

import type { Obj } from './obj.mts';
import { add, type Vector } from './vector.mts';

/** Flaring bell from the end of a tube */
function bell(obj: Obj, from: Vector, to: Vector, radius: number, start: number): void {
    const step = (t: number): Vector => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
    obj.tube(from, step(0.55), start, 16, start * 1.6);
    obj.tube(step(0.55), step(0.82), start * 1.6, 20, radius * 0.5);
    obj.tube(step(0.82), to, radius * 0.5, 24, radius);
}

export function trumpet(obj: Obj, mouth: Vector): void {
    const at = (x: number, y: number, z: number): Vector => add(mouth, [x, y, z]);
    obj.material('brass');
    obj.tube(at(0, 0, 0), at(0, 0, 0.03), 0.014, 10, 0.006);
    obj.tube(at(0, 0, 0.02), at(0, 0, 0.36), 0.008, 8);
    bell(obj, at(0, -0.055, 0.28), at(0, -0.055, 0.48), 0.063, 0.01);
    // The loop under the lead pipe and the three valves
    obj.tube(at(0.016, -0.055, 0.1), at(0.016, -0.055, 0.28), 0.007, 8);
    obj.tube(at(0.016, -0.055, 0.1), at(0, 0, 0.1), 0.007, 8);
    obj.tube(at(0, 0, 0.36), at(0, -0.055, 0.36), 0.007, 8);
    for (const z of [0.19, 0.22, 0.25]) {
        obj.tube(at(0, -0.075, z), at(0, 0.025, z), 0.012, 10);
        obj.tube(at(0, 0.025, z), at(0, 0.04, z), 0.004, 6, 0.009);
    }
}

export function trombone(obj: Obj, mouth: Vector): void {
    const at = (x: number, y: number, z: number): Vector => add(mouth, [x, y, z]);
    obj.material('brass');
    obj.tube(at(0, 0, 0), at(0, 0, 0.04), 0.018, 10, 0.008);
    // The slide, two tubes joined at their end
    for (const x of [0, -0.07]) {
        obj.tube(at(x, x === 0 ? 0 : -0.01, 0.03), at(x - 0.012, -0.17, 0.68), 0.008, 8);
    }
    obj.tube(at(-0.012, -0.17, 0.68), at(-0.082, -0.17, 0.68), 0.008, 8);
    obj.tube(at(0.0, -0.03, 0.17), at(-0.074, -0.04, 0.17), 0.006, 6);
    // The bell section, over the left shoulder
    obj.tube(at(-0.07, -0.01, 0.04), at(0.09, 0.02, -0.18), 0.008, 8);
    obj.tube(at(0.09, 0.02, -0.18), at(0.12, 0.02, -0.14), 0.01, 8);
    bell(obj, at(0.12, 0.02, -0.14), at(0.12, -0.05, 0.4), 0.11, 0.012);
}

export function saxophone(obj: Obj, mouth: Vector): void {
    const at = (x: number, y: number, z: number): Vector => add(mouth, [x, y, z]);
    obj.material('dark');
    obj.tube(at(0, 0, 0), at(0, -0.02, 0.06), 0.012, 10);
    obj.material('brass');
    const path: Array<[Vector, number]> = [
        [at(0, -0.02, 0.06), 0.011], [at(0, -0.035, 0.11), 0.013], [at(-0.01, -0.1, 0.125), 0.017], [at(-0.04, -0.3, 0.12), 0.027],
        [at(-0.08, -0.55, 0.13), 0.042], [at(-0.09, -0.63, 0.17), 0.046], [at(-0.09, -0.62, 0.23), 0.046]
    ];
    obj.loft(path.map(([point, radius]) => ({ at: point, width: radius, depth: radius })), 16, 4);
    bell(obj, at(-0.09, -0.62, 0.23), at(-0.09, -0.43, 0.27), 0.085, 0.044);
    obj.material('aluminium');
    for (let key = 0; key < 7; key++) {
        const t = key / 6;
        obj.ball(at(-0.015 - 0.065 * t, -0.17 - 0.35 * t, 0.145 + 0.035 * t), 0.013, 8, 5);
    }
}

/** Transverse flute, towards the right of the player (-X) */
export function flute(obj: Obj, mouth: Vector): void {
    const at = (x: number, y: number, z: number): Vector => add(mouth, [x, y, z]);
    obj.material('aluminium');
    obj.tube(at(0.07, -0.012, 0.02), at(-0.58, -0.055, 0.075), 0.011, 12);
    obj.tube(at(0.012, -0.016, 0.025), at(-0.012, -0.017, 0.027), 0.016, 12);
    for (let key = 0; key < 9; key++) {
        const t = 0.4 + key * 0.062;
        obj.ball(at(0.07 - 0.65 * t, -0.012 - 0.043 * t + 0.011, 0.02 + 0.055 * t), 0.008, 8, 5);
    }
}
