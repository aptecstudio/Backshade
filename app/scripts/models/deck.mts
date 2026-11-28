/**
 * Stage floor: decks, stairs and the drum riser.
 */

import { Obj } from './obj.mts';

/** Platform with legs and braces, top at the given height */
function platform(obj: Obj, width: number, depth: number, height: number): void {
    const x = width / 2;
    const z = depth / 2;
    obj.material('floor');
    obj.box([0, height - 0.03, 0], [width, 0.06, depth]);
    obj.material('aluminium');
    obj.box([0, height - 0.07, z - 0.02], [width, 0.04, 0.04]);
    obj.box([0, height - 0.07, 0.02 - z], [width, 0.04, 0.04]);
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            obj.tube([sx * (x - 0.05), 0, sz * (z - 0.05)], [sx * (x - 0.05), height - 0.06, sz * (z - 0.05)], 0.025, 8);
        }
    }
    // Tall platforms are braced
    if (height > 0.5) {
        for (const sz of [-1, 1]) {
            obj.tube([0.05 - x, 0.08, sz * (z - 0.05)], [x - 0.05, height - 0.1, sz * (z - 0.05)], 0.012, 6);
        }
    }
}

export function deck(width: number, depth: number, height: number): Obj {
    const obj = new Obj();
    obj.object('deck');
    platform(obj, width, depth, height);
    return obj;
}

/** Stairs of 1 m going up towards -Z, one step every 20 cm of height */
export function stairs(height: number): Obj {
    const obj = new Obj();
    obj.object('stairs');
    const steps = Math.round(height / 0.2);
    const going = 0.28;
    const front = (steps * going) / 2;
    for (let step = 0; step < steps; step++) {
        const top = ((step + 1) * height) / steps;
        const z = front - going * (step + 0.5);
        obj.material('floor');
        obj.box([0, top - 0.02, z], [1, 0.04, going]);
        obj.material('aluminium');
        for (const x of [-0.47, 0.47]) {
            obj.box([x, (top - 0.04) / 2, z], [0.04, top - 0.04, 0.04]);
        }
    }
    return obj;
}

/** Riser of 2 x 2 m with a black skirt, for the drums */
export function drumRiser(): Obj {
    const obj = new Obj();
    obj.object('riser');
    platform(obj, 2, 2, 0.4);
    obj.material('cloth');
    obj.box([0, 0.17, 0.995], [1.98, 0.32, 0.005]);
    for (const x of [-0.995, 0.995]) {
        obj.box([x, 0.17, 0], [0.005, 0.32, 1.98]);
    }
    return obj;
}
