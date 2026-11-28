/**
 * Electric guitar, acoustic guitar and bass, from the centre of the body
 * along the direction of the neck; the front faces +Z.
 */

import type { Obj, Section } from './obj.mts';
import { add, cross, scale, unit, type Vector } from './vector.mts';

export type GuitarKind = 'electric' | 'acoustic' | 'bass';

/** Outline of the bodies: position along the neck and half width */
const OUTLINES: Readonly<Record<GuitarKind, ReadonlyArray<[number, number]>>> = {
    electric: [[-0.19, 0.06], [-0.15, 0.14], [-0.08, 0.17], [0.01, 0.115], [0.08, 0.135], [0.14, 0.11], [0.17, 0.035]],
    acoustic: [[-0.24, 0.07], [-0.19, 0.17], [-0.1, 0.2], [0.01, 0.13], [0.1, 0.15], [0.18, 0.12], [0.23, 0.04]],
    bass: [[-0.2, 0.06], [-0.16, 0.14], [-0.08, 0.165], [0.01, 0.105], [0.09, 0.13], [0.16, 0.09], [0.19, 0.03]]
};

/** Position of the head of the neck from the centre of the body */
export const NECK_END: Readonly<Record<GuitarKind, number>> = { electric: 0.64, acoustic: 0.66, bass: 0.82 };

export function guitar(obj: Obj, kind: GuitarKind, centre: Vector, direction: Vector): void {
    const along = unit(direction);
    const side = unit(cross(along, [0, 0, 1]));
    const at = (length: number, across = 0, front = 0): Vector => add(add(centre, scale(along, length)), add(scale(side, across), [0, 0, front]));
    const depth = kind === 'acoustic' ? 0.055 : 0.022;
    obj.material(kind === 'acoustic' ? 'wood' : 'instrument');
    obj.loft(OUTLINES[kind].map(([length, width]): Section => ({ at: at(length), width, depth })), 16, 2);
    const end = NECK_END[kind];
    obj.material('dark');
    obj.tube(at(0.1, 0, depth), at(end, 0, depth), 0.019, 8, 0.016);
    obj.material('wood');
    obj.loft([
        { at: at(end - 0.01, 0, depth), width: 0.02, depth: 0.012 },
        { at: at(end + 0.07, 0, depth), width: 0.038, depth: 0.012 },
        { at: at(end + 0.14, 0, depth), width: 0.028, depth: 0.01 }
    ], 10, 2);
    obj.material('aluminium');
    for (const across of [-0.007, 0.007]) {
        obj.tube(at(-0.11, across, depth + 0.024), at(end, across, depth + 0.024), 0.0018, 4);
    }
    obj.box(at(-0.11, 0, depth + 0.012), [0.045, 0.03, 0.014]);
    obj.material('dark');
    if (kind === 'acoustic') {
        obj.tube(at(0.05, 0, depth - 0.004), at(0.05, 0, depth + 0.004), 0.055, 20);
    } else {
        for (const length of [-0.035, 0.05]) {
            obj.tube(at(length, -0.035, depth + 0.006), at(length, 0.035, depth + 0.006), 0.016, 8);
        }
    }
}
