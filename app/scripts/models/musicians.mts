/**
 * Band musicians with their instrument, as a man and as a woman.
 */

import { drumKit } from './drums.mts';
import { crossedStand } from './gear.mts';
import { guitar, NECK_END, type GuitarKind } from './guitar.mts';
import { grandPiano, keyboard } from './keys.mts';
import { LOOKS } from './looks.mts';
import { Obj } from './obj.mts';
import { mouthOf, person, shoulderOf, type Build } from './person.mts';
import { arm, heightOf, SEATED, seat, sitting } from './pose.mts';
import { microphone } from './singer.mts';
import { add, scale, unit, type Vector } from './vector.mts';

/** Standing player of a guitar or a bass, singing into a microphone with the acoustic */
function stringPlayer(build: Build, kind: GuitarKind): Obj {
    const role = ({ electric: 'guitarist', acoustic: 'acoustic', bass: 'bassist' } as const)[kind];
    const obj = new Obj();
    obj.object('musician');
    const tall = heightOf(build);
    const centre: Vector = [-0.09, 1.0 * tall, 0.17 + (kind === 'acoustic' ? 0.03 : 0)];
    const direction = unit([1, 0.36, 0]);
    // The left hand on the neck, a little before its head
    const fret = add(centre, scale(direction, NECK_END[kind] * 0.68));
    person(
        obj,
        build,
        LOOKS[role][build === 'male' ? 0 : 1],
        arm([-0.31, 1.15 * tall, 0.04], add(centre, [-0.1, 0.09, 0.08]), add(centre, [0.01, 0.01, 0.075]), true),
        arm([0.33, 1.1 * tall, 0.02], add(fret, [0.02, -0.06, -0.03]), add(fret, [-0.01, 0.025, 0.03]), true)
    );
    guitar(obj, kind, centre, direction);
    obj.material('shoes');
    obj.tube(add(centre, scale(direction, 0.14)), [0.17, 1.47 * tall, 0.05], 0.009, 6);
    if (kind === 'acoustic') {
        microphone(obj, mouthOf(build));
    }
    return obj;
}

export const guitarist = (build: Build): Obj => stringPlayer(build, 'electric');
export const acousticGuitarist = (build: Build): Obj => stringPlayer(build, 'acoustic');
export const bassist = (build: Build): Obj => stringPlayer(build, 'bass');

export function drummer(build: Build): Obj {
    const obj = new Obj();
    obj.object('musician');
    obj.within([0, 0, -0.35], () => {
        const right = shoulderOf(build, -1, SEATED);
        const left = shoulderOf(build, 1, SEATED);
        const rightHand: Vector = [0.05, 0.93, 0.29];
        const leftHand: Vector = [0.22, 0.84, 0.2];
        seat(obj, 0.36);
        person(
            obj,
            build,
            LOOKS.drummer[build === 'male' ? 0 : 1],
            arm(add(right, [-0.05, -0.24, 0.12]), [-0.04, 0.92, 0.23], rightHand, true),
            arm(add(left, [0.11, -0.26, 0.04]), [0.26, 0.86, 0.14], leftHand, true),
            { drop: SEATED, legs: sitting(0.2) }
        );
        drumKit(obj);
        obj.material('wood');
        obj.tube(rightHand, [0.44, 0.9, 0.38], 0.007, 6, 0.005);
        obj.tube(leftHand, [0.13, 0.74, 0.37], 0.007, 6, 0.005);
    });
    return obj;
}

export function keyboardist(build: Build): Obj {
    const obj = new Obj();
    obj.object('musician');
    const tall = heightOf(build);
    obj.within([0, 0, -0.16], () => {
        const [right, left] = [-1, 1].map((side) => arm([side * 0.27, 1.12 * tall, 0.03], [side * 0.2, 1.01, 0.22], [side * 0.18, 0.955, 0.31]));
        person(obj, build, LOOKS.keyboardist[build === 'male' ? 0 : 1], right, left);
        crossedStand(obj, 0.84, 0.8);
        keyboard(obj, 0.86, 0.26);
    });
    return obj;
}

export function pianist(build: Build): Obj {
    const obj = new Obj();
    obj.object('musician');
    obj.within([0, 0, -0.9], () => {
        const [right, left] = [-1, 1].map((side) => arm(add(shoulderOf(build, side, SEATED), [side * 0.07, -0.27, 0.01]), [side * 0.2, 0.8, 0.15], [side * 0.18, 0.75, 0.25]));
        seat(obj, 0.8);
        person(obj, build, LOOKS.pianist[build === 'male' ? 0 : 1], right, left, { drop: SEATED, legs: sitting(0.13) });
        grandPiano(obj);
    });
    return obj;
}
