/**
 * Amplifiers and speakers: guitar and bass stacks, combo, floor monitor, PA
 * and subwoofer.
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

/** Speaker cabinet standing at a height, with the grille on its front */
function cabinet(obj: Obj, bottom: number, [width, height, depth]: Vector): void {
    obj.material('body');
    obj.box([0, bottom + height / 2, 0], [width, height, depth]);
    obj.material('cloth');
    obj.box([0, bottom + height / 2, depth / 2 + 0.002], [width - 0.08, height - 0.08, 0.004]);
}

/** Amplifier head with its controls, on top of something */
function head(obj: Obj, bottom: number, width: number): void {
    obj.material('body');
    obj.box([0, bottom + 0.13, 0], [width, 0.24, 0.26]);
    obj.material('panel');
    obj.box([0, bottom + 0.13, 0.132], [width - 0.1, 0.08, 0.004]);
    obj.material('aluminium');
    for (let knob = 0; knob < 6; knob++) {
        const x = -width / 2 + 0.12 + (knob * (width - 0.24)) / 5;
        obj.tube([x, bottom + 0.13, 0.134], [x, bottom + 0.13, 0.15], 0.016, 8);
    }
}

function feet(obj: Obj, halfWidth: number): void {
    obj.material('shoes');
    for (const x of [-halfWidth, halfWidth]) {
        obj.tube([x, 0, 0], [x, 0.012, 0], 0.03, 8);
    }
}

/** Guitar amplifier head on its cabinet */
export function amp(): Obj {
    const obj = new Obj();
    obj.object('amp');
    feet(obj, 0.3);
    cabinet(obj, 0.012, [0.76, 0.76, 0.36]);
    head(obj, 0.772, 0.72);
    return obj;
}

/** Bass head on a cabinet with four speakers */
export function bassAmp(): Obj {
    const obj = new Obj();
    obj.object('amp');
    feet(obj, 0.26);
    cabinet(obj, 0.012, [0.66, 0.98, 0.42]);
    obj.material('dark');
    for (const x of [-0.14, 0.14]) {
        for (const y of [0.31, 0.69]) {
            obj.tube([x, y, 0.212], [x, y, 0.218], 0.12, 20);
        }
    }
    head(obj, 0.992, 0.56);
    return obj;
}

/** Small amplifier with its speaker and controls in one box */
export function combo(): Obj {
    const obj = new Obj();
    obj.object('combo');
    feet(obj, 0.22);
    cabinet(obj, 0.012, [0.56, 0.46, 0.26]);
    obj.material('panel');
    obj.box([0, 0.44, 0.136], [0.48, 0.05, 0.004]);
    return obj;
}

/** PA speaker on its pole and tripod */
export function paSpeaker(): Obj {
    const obj = new Obj();
    obj.object('speaker');
    obj.material('aluminium');
    const hub: Vector = [0, 0.5, 0];
    for (const [x, z] of [[0, 0.5], [-0.43, -0.25], [0.43, -0.25]]) {
        obj.tube([x, 0, z], hub, 0.016, 8);
    }
    obj.tube(hub, [0, 1.45, 0], 0.022, 10);
    cabinet(obj, 1.42, [0.42, 0.66, 0.36]);
    return obj;
}

export function subwoofer(): Obj {
    const obj = new Obj();
    obj.object('subwoofer');
    feet(obj, 0.3);
    cabinet(obj, 0.012, [0.72, 0.6, 0.7]);
    return obj;
}
