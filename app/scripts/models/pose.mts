/**
 * What the musicians share: arms, the legs of who sits, stools, chairs and
 * music stands.
 */

import type { Obj } from './obj.mts';
import { shoulderOf, type Arm, type Build, type Leg } from './person.mts';
import type { Vector } from './vector.mts';

/** How much a figure on a stool, a bench or a chair is lowered */
export const SEATED = 0.32;

export const arm = (elbow: Vector, wrist: Vector, hand: Vector, grip = false): Arm => ({ elbow, wrist, hand, grip });

/** Height of a build compared with the male one */
export const heightOf = (build: Build): number => shoulderOf(build, 1)[1] / 1.42;

/** Legs of who sits, feet forward */
export const sitting = (spread: number): [Leg, Leg] => [
    { knee: [-spread, 0.57, 0.38], ankle: [-Math.max(0.12, spread - 0.04), 0.12, 0.45] },
    { knee: [spread, 0.57, 0.36], ankle: [spread + 0.04, 0.12, 0.43] }
];

/** Stool, or a bench when wide; a chair has a back */
export function seat(obj: Obj, width: number, back = false): void {
    obj.material('body');
    if (width > 0.5) {
        obj.box([0, 0.47, -0.04], [width, 0.08, 0.34]);
    } else {
        obj.tube([0, 0.44, -0.03], [0, 0.51, -0.03], width / 2, 20);
    }
    obj.material('aluminium');
    for (const x of [-1, 1]) {
        for (const z of [-0.14, 0.08]) {
            obj.tube([x * width * 0.45, 0, z], [x * width * 0.3, 0.45, z * 0.6], 0.014, 6);
        }
    }
    if (back) {
        for (const x of [-0.15, 0.15]) {
            obj.tube([x, 0.46, -0.19], [x, 0.94, -0.22], 0.012, 6);
        }
        obj.material('body');
        obj.box([0, 0.87, -0.218], [0.36, 0.14, 0.025]);
    }
}

/** Stand with the sheets towards the player, at a point of the floor */
export function musicStand(obj: Obj, x: number, z: number, height: number): void {
    obj.material('body');
    for (const [dx, dz] of [[0, 0.2], [-0.17, -0.1], [0.17, -0.1]]) {
        obj.tube([x + dx, 0, z + dz], [x, 0.18, z], 0.008, 6);
    }
    obj.tube([x, 0.18, z], [x, height, z], 0.008, 6);
    obj.box([x, height + 0.1, z], [0.42, 0.24, 0.012]);
    obj.material('keys');
    obj.box([x, height + 0.11, z - 0.009], [0.36, 0.2, 0.004]);
}
