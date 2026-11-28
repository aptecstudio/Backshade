/**
 * Keyboard instruments: the stage keyboard and the grand piano, with the
 * keys towards the player, who faces +Z.
 */

import type { Obj } from './obj.mts';
import type { Vector } from './vector.mts';

/** White keys with the black ones in groups of two and three, from low (+X) to high */
function keys(obj: Obj, width: number, top: number, front: number): void {
    obj.material('keys');
    obj.box([0, top - 0.008, front + 0.07], [width, 0.016, 0.14]);
    const white = width / 42;
    obj.material('dark');
    for (let key = 0; key < 41; key++) {
        if (![2, 6].includes(key % 7)) {
            obj.box([width / 2 - (key + 1) * white, top + 0.006, front + 0.095], [white * 0.55, 0.012, 0.09]);
        }
    }
}

/** Keyboard resting at a height, its keys from the front depth */
export function keyboard(obj: Obj, height: number, front: number): void {
    obj.material('body');
    obj.box([0, height + 0.03, front + 0.15], [1.28, 0.06, 0.32]);
    keys(obj, 1.2, height + 0.075, front);
    obj.material('panel');
    obj.box([0, height + 0.075, front + 0.22], [1.2, 0.03, 0.14]);
}

/** Grand piano with the lid open, its keys from z 0.22 and its tail towards the audience */
export function grandPiano(obj: Obj): void {
    const outline: Array<[number, number]> = [[0.74, 0.36], [-0.74, 0.36], [-0.74, 0.85], [-0.56, 1.16], [-0.24, 1.42], [-0.12, 1.82], [0.08, 2.06], [0.42, 2.14], [0.74, 1.96]];
    obj.material('gloss');
    obj.prism(outline, 0.66, 0.94);
    obj.box([0, 0.68, 0.29], [1.48, 0.04, 0.16]);
    for (const x of [-0.7, 0.7]) {
        obj.box([x, 0.74, 0.29], [0.08, 0.1, 0.16]);
    }
    keys(obj, 1.32, 0.725, 0.22);
    obj.material('gloss');
    for (const [x, z] of [[-0.64, 0.46], [0.64, 0.46], [0.36, 1.92]]) {
        obj.tube([x, 0, z], [x, 0.66, z], 0.035, 10, 0.065);
    }
    // Pedals and their post
    obj.box([0, 0.4, 0.52], [0.18, 0.54, 0.05]);
    obj.material('brass');
    for (const x of [-0.06, 0, 0.06]) {
        obj.box([x, 0.12, 0.46], [0.025, 0.015, 0.1]);
    }
    // Music stand, then the lid hinged on the bass side and its prop
    obj.material('gloss');
    obj.box([0, 1.06, 0.52], [0.62, 0.24, 0.02]);
    const raised = ([x, z]: [number, number]): Vector => [0.74 - (0.74 - x) * 0.82, 0.95 + (0.74 - x) * 0.57, z];
    obj.face(outline.map(([x, z]): [number, number] => [x, Math.max(z, 0.66)]).map(raised));
    obj.tube([-0.5, 0.94, 1.1], raised([-0.52, 1.16]), 0.012, 6);
}
