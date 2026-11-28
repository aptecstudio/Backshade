/**
 * Drum kit seen from the drummer, who sits at the origin facing +Z: the
 * hi-hat is on their left (+X), the floor tom and the ride on their right.
 */

import type { Obj } from './obj.mts';
import { add, scale, unit, type Vector } from './vector.mts';

/** Shell with its skins and rims, between the centres of its two faces */
function drum(obj: Obj, from: Vector, to: Vector, radius: number): void {
    const axis = unit([to[0] - from[0], to[1] - from[1], to[2] - from[2]]);
    obj.material('instrument');
    obj.tube(from, to, radius, 20);
    for (const [face, out] of [[from, -1], [to, 1]] as const) {
        obj.material('aluminium');
        obj.tube(add(face, scale(axis, -0.008 * out)), add(face, scale(axis, 0.008 * out)), radius + 0.008, 20);
        obj.material('skin');
        obj.tube(add(face, scale(axis, 0.006 * out)), add(face, scale(axis, 0.012 * out)), radius - 0.012, 20);
    }
}

/** Upright stand on three feet */
function stand(obj: Obj, x: number, z: number, height: number): void {
    obj.material('aluminium');
    for (const [dx, dz] of [[0, 0.18], [-0.16, -0.09], [0.16, -0.09]]) {
        obj.tube([x + dx, 0, z + dz], [x, 0.2, z], 0.01, 6);
    }
    obj.tube([x, 0.2, z], [x, height, z], 0.012, 8);
}

function cymbal(obj: Obj, at: Vector, radius: number, tilt: number): void {
    const axis = unit([0, 1, -tilt]);
    obj.material('brass');
    obj.tube(at, add(at, scale(axis, 0.006)), radius, 28);
    obj.tube(add(at, scale(axis, 0.006)), add(at, scale(axis, 0.022)), radius * 0.22, 14, radius * 0.08);
}

export function drumKit(obj: Obj): void {
    // Bass drum with its legs
    drum(obj, [0, 0.29, 0.55], [0, 0.29, 0.95], 0.28);
    obj.material('aluminium');
    for (const x of [-1, 1]) {
        obj.tube([x * 0.24, 0.2, 0.85], [x * 0.42, 0, 0.98], 0.012, 6);
    }
    // Rack toms on their holders
    for (const x of [-0.17, 0.17]) {
        obj.material('aluminium');
        obj.tube([x * 0.3, 0.56, 0.74], [x, 0.66, 0.68], 0.012, 6);
        drum(obj, [x, 0.66, 0.7], [x, 0.8, 0.64], 0.14);
    }
    stand(obj, 0.17, 0.34, 0.58);
    drum(obj, [0.17, 0.58, 0.34], [0.17, 0.71, 0.34], 0.17);
    // Floor tom
    drum(obj, [-0.46, 0.26, 0.34], [-0.46, 0.64, 0.34], 0.2);
    obj.material('aluminium');
    for (const [dx, dz] of [[0, 0.21], [-0.19, -0.1], [0.19, -0.1]]) {
        obj.tube([-0.46 + dx, 0, 0.34 + dz], [-0.46 + dx, 0.45, 0.34 + dz], 0.009, 6);
    }
    // Hi-hat, crash and ride
    stand(obj, 0.46, 0.4, 0.92);
    cymbal(obj, [0.46, 0.84, 0.4], 0.17, 0);
    cymbal(obj, [0.46, 0.87, 0.4], 0.17, 0);
    stand(obj, 0.6, 0.72, 1.2);
    cymbal(obj, [0.55, 1.2, 0.68], 0.2, 0.25);
    stand(obj, -0.66, 0.66, 1);
    cymbal(obj, [-0.58, 1.0, 0.62], 0.24, 0.2);
    // Pedals
    obj.material('aluminium');
    obj.box([-0.12, 0.015, 0.47], [0.1, 0.03, 0.22]);
    obj.box([0.24, 0.015, 0.45], [0.1, 0.03, 0.22]);
}
