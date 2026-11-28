/**
 * Stands, cases and the DJ booth.
 */

import { guitar } from './guitar.mts';
import { Obj } from './obj.mts';
import { microphone } from './singer.mts';
import type { Vector } from './vector.mts';

/** Microphone on a stand with a boom, at the height of a standing singer */
export function micStand(): Obj {
    const obj = new Obj();
    obj.object('stand');
    obj.within([0, 0, -0.33], () => microphone(obj, [0, 1.55, 0.098]));
    return obj;
}

/** Crossed legs that hold a keyboard at the given height */
export function crossedStand(obj: Obj, height: number, width: number): void {
    obj.material('body');
    const x = width / 2;
    for (const z of [-0.1, 0.1]) {
        obj.tube([-x, 0.02, z], [x, height, z], 0.018, 8);
        obj.tube([x, 0.02, z], [-x, height, z], 0.018, 8);
    }
    for (const side of [-x, x]) {
        obj.tube([side, 0.02, -0.18], [side, 0.02, 0.18], 0.02, 8);
        obj.tube([side, height, -0.15], [side, height, 0.15], 0.02, 8);
    }
}

export function keyboardStand(): Obj {
    const obj = new Obj();
    obj.object('stand');
    crossedStand(obj, 0.86, 0.7);
    return obj;
}

/** Guitar resting on its stand */
export function guitarStand(): Obj {
    const obj = new Obj();
    obj.object('stand');
    obj.material('body');
    const hub: Vector = [0, 0.22, -0.09];
    for (const [x, z] of [[0, -0.34], [-0.24, 0.1], [0.24, 0.1]]) {
        obj.tube([x, 0, z], hub, 0.014, 8);
    }
    obj.tube(hub, [0, 0.8, -0.09], 0.014, 8);
    for (const x of [-0.1, 0.1]) {
        obj.tube(hub, [x, 0.17, 0.05], 0.012, 8);
    }
    obj.tube([-0.05, 0.8, -0.03], [0.05, 0.8, -0.03], 0.012, 8);
    obj.tube([0, 0.8, -0.09], [0, 0.8, -0.03], 0.012, 8);
    guitar(obj, 'electric', [0, 0.38, 0], [0, 1, 0]);
    return obj;
}

/** Flight case with its metal edges, on wheels when large */
function flightCase(width: number, height: number, depth: number, wheels: boolean): Obj {
    const obj = new Obj();
    obj.object('case');
    const bottom = wheels ? 0.1 : 0;
    const x = width / 2;
    const z = depth / 2;
    obj.material('dark');
    obj.box([0, bottom + height / 2, 0], [width, height, depth]);
    obj.material('aluminium');
    for (const y of [bottom, bottom + height * 0.7, bottom + height]) {
        for (const sz of [-z, z]) {
            obj.tube([-x, y, sz], [x, y, sz], 0.012, 6);
        }
        for (const sx of [-x, x]) {
            obj.tube([sx, y, -z], [sx, y, z], 0.012, 6);
        }
    }
    for (const sx of [-x, x]) {
        for (const sz of [-z, z]) {
            obj.tube([sx, bottom, sz], [sx, bottom + height, sz], 0.012, 6);
        }
    }
    for (const side of [-width / 4, width / 4]) {
        obj.box([side, bottom + height * 0.7, z + 0.012], [0.08, 0.1, 0.012]);
    }
    if (wheels) {
        obj.material('shoes');
        for (const sx of [-x + 0.08, x - 0.08]) {
            for (const sz of [-z + 0.08, z - 0.08]) {
                obj.tube([sx - 0.025, 0.05, sz], [sx + 0.025, 0.05, sz], 0.05, 12);
            }
        }
    }
    return obj;
}

export const smallCase = (): Obj => flightCase(0.6, 0.45, 0.45, false);
export const largeCase = (): Obj => flightCase(1.2, 0.8, 0.6, true);

/** DJ booth: a table closed towards the audience, two players and the mixer */
export function djBooth(): Obj {
    const obj = new Obj();
    obj.object('booth');
    obj.material('body');
    obj.box([0, 0.97, 0], [1.8, 0.06, 0.7]);
    obj.box([0, 0.47, 0.33], [1.8, 0.94, 0.04]);
    for (const x of [-0.88, 0.88]) {
        obj.box([x, 0.47, 0], [0.04, 0.94, 0.7]);
    }
    obj.material('panel');
    for (const x of [-0.5, 0.5]) {
        obj.box([x, 1.05, -0.02], [0.4, 0.1, 0.45]);
    }
    obj.box([0, 1.05, -0.02], [0.4, 0.1, 0.45]);
    obj.material('dark');
    for (const x of [-0.5, 0.5]) {
        obj.tube([x, 1.1, -0.06], [x, 1.115, -0.06], 0.14, 24);
    }
    obj.material('aluminium');
    for (const x of [-0.12, -0.04, 0.04, 0.12]) {
        obj.box([x, 1.11, -0.14], [0.015, 0.02, 0.1]);
        for (const z of [0, 0.07, 0.14]) {
            obj.tube([x, 1.1, z - 0.02], [x, 1.125, z - 0.02], 0.014, 8);
        }
    }
    return obj;
}
