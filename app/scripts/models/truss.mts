/**
 * Truss models of the stage: straight runs, joints, base plate and towers.
 * The section is a square of 29 cm and runs rest on the floor.
 */

import { Obj } from './obj.mts';
import { add, scale, sub, unit, type Vector } from './vector.mts';

/** Distance of the chords from the axis, and size of the section */
const HALF = 0.12;
const SIZE = 0.29;
/** Height of the axis of a run lying on the floor */
const AXIS = HALF + 0.025;
/** Length of the arms of a joint, beyond its central block */
const ARM = 0.5 - SIZE / 2;

/** Run of truss along its axis, with chords, end frames and diagonals; u and v span the section */
function run(obj: Obj, from: Vector, to: Vector, u: Vector, v: Vector): void {
    const length = Math.hypot(...sub(to, from));
    const axis = unit(sub(to, from));
    const corners: Array<[number, number]> = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const point = (corner: [number, number], along: number): Vector =>
        add(add(from, scale(axis, along)), add(scale(u, corner[0] * HALF), scale(v, corner[1] * HALF)));
    obj.material('aluminium');
    for (const corner of corners) {
        obj.tube(point(corner, 0), point(corner, length), 0.025, 8);
    }
    const bays = Math.max(1, Math.round(length / 0.25));
    corners.forEach((corner, side) => {
        const next = corners[(side + 1) % 4];
        for (const end of [0, length]) {
            obj.tube(point(corner, end), point(next, end), 0.008, 6);
        }
        for (let bay = 0; bay < bays; bay++) {
            const start = (bay * length) / bays;
            const end = ((bay + 1) * length) / bays;
            obj.tube(point(corner, bay % 2 === 0 ? start : end), point(next, bay % 2 === 0 ? end : start), 0.008, 6);
        }
    });
}

/** Straight run along X */
export function truss(length: number): Obj {
    const obj = new Obj();
    obj.object('truss');
    run(obj, [-length / 2, AXIS, 0], [length / 2, AXIS, 0], [0, 0, 1], [0, 1, 0]);
    return obj;
}

/** Joint lying on the floor: a central block with arms towards the given directions (X and Z) */
export function joint(directions: Array<[number, number]>): Obj {
    const obj = new Obj();
    obj.object('truss');
    run(obj, [-SIZE / 2, AXIS, 0], [SIZE / 2, AXIS, 0], [0, 0, 1], [0, 1, 0]);
    for (const [x, z] of directions) {
        const start: Vector = [x * SIZE / 2, AXIS, z * SIZE / 2];
        run(obj, start, add(start, [x * ARM, 0, z * ARM]), [z, 0, x], [0, 1, 0]);
    }
    return obj;
}

/** Square steel plate with the sockets of the four chords */
function plate(obj: Obj, bottom: number, size: number): void {
    obj.material('body');
    obj.box([0, bottom + 0.01, 0], [size, 0.02, size]);
    for (const x of [-HALF, HALF]) {
        for (const z of [-HALF, HALF]) {
            obj.tube([x, bottom + 0.02, z], [x, bottom + 0.07, z], 0.032, 8);
        }
    }
}

export function basePlate(): Obj {
    const obj = new Obj();
    obj.object('base');
    plate(obj, 0, 0.8);
    return obj;
}

/** Upright truss on its base plate, with a plate on top */
export function tower(height: number): Obj {
    const obj = new Obj();
    obj.object('tower');
    plate(obj, 0, 0.8);
    run(obj, [0, 0.02, 0], [0, height - 0.02, 0], [1, 0, 0], [0, 0, 1]);
    obj.material('body');
    obj.box([0, height - 0.01, 0], [0.34, 0.02, 0.34]);
    return obj;
}
