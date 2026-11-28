/**
 * Singers: a figure holding with the right hand the microphone on its stand,
 * the left arm relaxed.
 */

import { LOOKS } from './looks.mts';
import { Obj } from './obj.mts';
import { mouthOf, person, shoulderOf, type Build } from './person.mts';
import { add, type Vector } from './vector.mts';

/** Microphone with its grille, the clip and a stand with a boom */
export function microphone(obj: Obj, mouth: Vector): void {
    const head = add(mouth, [0, -0.012, 0.065]);
    const handle = add(mouth, [0, -0.085, 0.165]);
    const joint: Vector = [0, mouth[1] - 0.17, 0.43];
    obj.material('body');
    obj.tube(head, handle, 0.019, 12, 0.012);
    obj.material('aluminium');
    obj.ball(head, 0.028, 16, 10);
    obj.tube(handle, joint, 0.007, 8);
    obj.tube(joint, [0, 0.03, 0.43], 0.011, 10);
    obj.material('body');
    obj.ball(joint, 0.018, 10, 6);
    obj.tube([0, 0.006, 0.43], [0, 0.034, 0.43], 0.15, 24, 0.03);
}

export function singer(build: Build): Obj {
    const obj = new Obj();
    obj.object('singer');
    const mouth = mouthOf(build);
    const right = shoulderOf(build, -1);
    const left = shoulderOf(build, 1);
    person(
        obj,
        build,
        LOOKS.singer[build === 'male' ? 0 : 1],
        { elbow: add(right, [-0.055, -0.25, 0.08]), wrist: add(mouth, [-0.07, -0.13, 0.1]), hand: add(mouth, [0.02, -0.07, 0.15]), grip: true },
        { elbow: add(left, [0.07, -0.29, -0.01]), wrist: add(left, [0.1, -0.54, 0.04]), hand: add(left, [0.105, -0.7, 0.06]), grip: false }
    );
    microphone(obj, mouth);
    return obj;
}
