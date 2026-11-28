/**
 * Violin, viola and cello (the same shape at three sizes) with their bow.
 */

import type { Obj } from './obj.mts';
import { add, cross, scale, unit, type Vector } from './vector.mts';

/** Outline of the body for a violin: position along the neck and half width */
const OUTLINE: ReadonlyArray<[number, number]> = [
    [-0.18, 0.015], [-0.165, 0.075], [-0.12, 0.105], [-0.065, 0.095], [-0.035, 0.058], [0.02, 0.055], [0.045, 0.08], [0.1, 0.088], [0.155, 0.062], [0.175, 0.012]
];

export interface StringShape {
    /** Centre of the body */
    centre: Vector;
    /** Direction of the neck */
    along: Vector;
    /** Direction the front of the instrument faces */
    normal: Vector;
    /** 1 for a violin, 1.15 for a viola, 2.1 for a cello */
    size: number;
}

/** Point of the instrument, from violin measures: along the neck, across and in front */
export function pointOn({ centre, along, normal, size }: StringShape, length: number, side = 0, front = 0): Vector {
    const neck = unit(along);
    const face = unit(normal);
    const across = unit(cross(neck, face));
    return add(add(add(centre, scale(neck, length * size)), scale(across, side * size)), scale(face, front * size));
}

export function bowed(obj: Obj, shape: StringShape): void {
    const { size } = shape;
    const at = (length: number, side = 0, front = 0): Vector => pointOn(shape, length, side, front);
    const half = 0.017;
    obj.material('wood');
    OUTLINE.slice(1).forEach(([length, width], index) => {
        const [previous, before] = OUTLINE[index];
        for (const front of [-half, half]) {
            obj.face([at(previous, -before, front), at(previous, before, front), at(length, width, front), at(length, -width, front)]);
        }
        for (const side of [-1, 1]) {
            obj.face([at(previous, side * before, -half), at(previous, side * before, half), at(length, side * width, half), at(length, side * width, -half)]);
        }
    });
    // Neck, scroll, fingerboard, bridge, tailpiece and strings
    obj.tube(at(0.15, 0, 0.004), at(0.3), 0.011 * size, 8);
    obj.ball(at(0.31), 0.018 * size, 10, 6);
    obj.material('dark');
    obj.tube(at(0.02, 0, 0.031), at(0.27, 0, 0.018), 0.011 * size, 8, 0.008 * size);
    obj.tube(at(-0.16, 0, 0.022), at(-0.085, 0, 0.026), 0.011 * size, 8);
    obj.tube(at(-0.05, -0.022, 0.028), at(-0.05, 0.022, 0.028), 0.006 * size, 6);
    obj.material('aluminium');
    for (const side of [-0.008, 0.008]) {
        obj.tube(at(-0.09, side, 0.036), at(0.28, side * 0.5, 0.026), 0.0012 * size, 4);
    }
}

/** Bow from the frog, in the right hand, to its tip */
export function bow(obj: Obj, frog: Vector, tip: Vector): void {
    obj.material('wood');
    obj.tube(frog, tip, 0.006, 6, 0.004);
    obj.material('keys');
    obj.tube(add(frog, [0, -0.014, 0]), add(tip, [0, -0.008, 0]), 0.003, 4);
    obj.material('dark');
    obj.ball(add(frog, [0, -0.007, 0]), 0.013, 8, 5);
}
