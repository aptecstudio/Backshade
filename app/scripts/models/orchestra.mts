/**
 * Orchestra musicians, as a man and as a woman: harp, violin, trumpet,
 * trombone, saxophone, flute and the string trio.
 */

import { harp } from './harp.mts';
import { LOOKS, type Role } from './looks.mts';
import { Obj } from './obj.mts';
import { mouthOf, person, shoulderOf, type Arm, type Build, type Pose } from './person.mts';
import { arm, heightOf, musicStand, SEATED, seat, sitting } from './pose.mts';
import { bow, bowed, pointOn, type StringShape } from './strings.mts';
import { add, type Vector } from './vector.mts';
import { flute, saxophone, trombone, trumpet } from './winds.mts';

const figure = (obj: Obj, build: Build, role: Role, right: Arm, left: Arm, pose: Pose = {}): void =>
    person(obj, build, LOOKS[role][build === 'male' ? 0 : 1], right, left, pose);

/** A standing or seated musician as a whole model */
function model(draw: (obj: Obj) => void): Obj {
    const obj = new Obj();
    obj.object('musician');
    draw(obj);
    return obj;
}

/** Violin or viola under the chin, standing or on a chair */
function violinPlayer(obj: Obj, build: Build, role: Role, size: number, seated: boolean): void {
    const drop = seated ? SEATED : 0;
    const tall = heightOf(build);
    const lower = (y: number): number => y * tall - drop;
    const shape: StringShape = { centre: [0.1, lower(1.47), 0.12], along: [0.7, 0, 0.72], normal: [-0.15, 0.94, 0.3], size };
    const neck = pointOn(shape, 0.22);
    // Point of the strings under the bow, and the bow across them
    const strings = pointOn(shape, -0.02, 0, 0.045);
    const across: Vector = [-0.72, 0.1, 0.7];
    const frog = add(strings, [across[0] * 0.14, across[1] * 0.14, across[2] * 0.14]);
    figure(
        obj,
        build,
        role,
        arm([-0.25, lower(1.27), 0.1], add(frog, [-0.07, -0.03, -0.03]), frog, true),
        arm([0.27, lower(1.2), 0.16], add(neck, [0.01, -0.08, -0.04]), add(neck, [0, -0.01, 0.025]), true),
        seated ? { drop, legs: sitting(0.12) } : {}
    );
    bowed(obj, shape);
    bow(obj, frog, add(strings, [across[0] * -0.5, across[1] * -0.5, across[2] * -0.5]));
}

/** Cello between the knees */
function cellist(obj: Obj, build: Build, role: Role): void {
    const shape: StringShape = { centre: [0, 0.6, 0.34], along: [0.12, 0.94, -0.3], normal: [-0.04, 0.3, 0.95], size: 2.05 };
    const neck = pointOn(shape, 0.265);
    const strings = pointOn(shape, -0.055, 0, 0.05);
    const frog = add(strings, [-0.22, 0.01, 0.02]);
    figure(
        obj,
        build,
        role,
        arm([-0.32, 0.86, 0.14], add(frog, [-0.05, 0.05, -0.04]), frog, true),
        arm([0.34, 0.95, 0.07], add(neck, [0.08, -0.01, -0.01]), add(neck, [-0.005, 0.005, 0.045]), true),
        { drop: SEATED, legs: sitting(0.27) }
    );
    bowed(obj, shape);
    obj.material('aluminium');
    obj.tube(pointOn(shape, -0.18), [-0.04, 0, 0.42], 0.007, 6);
    bow(obj, frog, add(strings, [0.46, -0.02, -0.02]));
}

export const violinist = (build: Build): Obj => model((obj) => violinPlayer(obj, build, 'violinist', 1, false));

export const harpist = (build: Build): Obj => model((obj) => obj.within([0, 0, -0.45], () => {
    const [right, left] = [-1, 1].map((side) => arm(
        add(shoulderOf(build, side, SEATED), [side * 0.09, -0.22, 0.1]),
        [side * 0.11 - 0.07, 1.0, 0.3],
        [side * 0.055 - 0.07, 1.03, 0.4]
    ));
    seat(obj, 0.36);
    figure(obj, build, 'harpist', right, left, { drop: SEATED, legs: sitting(0.24) });
    harp(obj, -0.07);
}));

export const trumpeter = (build: Build): Obj => model((obj) => {
    const mouth = mouthOf(build);
    figure(
        obj,
        build,
        'trumpeter',
        arm(add(shoulderOf(build, -1), [-0.05, -0.17, 0.14]), add(mouth, [-0.08, -0.07, 0.17]), add(mouth, [-0.005, 0.01, 0.22]), true),
        arm(add(shoulderOf(build, 1), [0.02, -0.18, 0.13]), add(mouth, [0.07, -0.09, 0.15]), add(mouth, [0.005, -0.045, 0.21]), true)
    );
    trumpet(obj, mouth);
});

export const trombonist = (build: Build): Obj => model((obj) => {
    const mouth = mouthOf(build);
    figure(
        obj,
        build,
        'trombonist',
        arm(add(shoulderOf(build, -1), [-0.04, -0.13, 0.17]), add(mouth, [-0.1, -0.13, 0.28]), add(mouth, [-0.05, -0.1, 0.36]), true),
        arm(add(shoulderOf(build, 1), [0.03, -0.17, 0.11]), add(mouth, [0.07, -0.09, 0.11]), add(mouth, [0.0, -0.035, 0.15]), true)
    );
    trombone(obj, mouth);
});

export const saxophonist = (build: Build): Obj => model((obj) => {
    const mouth = mouthOf(build);
    figure(
        obj,
        build,
        'saxophonist',
        arm(add(shoulderOf(build, -1), [-0.08, -0.26, 0.02]), add(mouth, [-0.17, -0.46, 0.1]), add(mouth, [-0.08, -0.44, 0.14]), true),
        arm(add(shoulderOf(build, 1), [0.05, -0.23, 0.07]), add(mouth, [0.07, -0.26, 0.12]), add(mouth, [-0.01, -0.24, 0.145]), true)
    );
    saxophone(obj, mouth);
});

export const flutist = (build: Build): Obj => model((obj) => {
    const mouth = mouthOf(build);
    figure(
        obj,
        build,
        'flutist',
        arm(add(shoulderOf(build, -1), [-0.15, -0.14, 0.04]), add(mouth, [-0.36, -0.1, 0.0]), add(mouth, [-0.37, -0.055, 0.058]), true),
        arm(add(shoulderOf(build, 1), [-0.14, -0.2, 0.18]), add(mouth, [-0.11, -0.09, 0.005]), add(mouth, [-0.17, -0.03, 0.04]), true)
    );
    flute(obj, mouth);
});

/** Violin, viola and cello, seated side by side as the audience reads them; the build of each player */
export const stringTrio = (violin: Build, viola: Build = violin, cello: Build = violin): Obj => model((obj) => obj.within([0, 0, -0.3], () => {
    const player = (x: number, draw: () => void): void => obj.within([x, 0, 0], () => {
        seat(obj, 0.38, true);
        draw();
    });
    player(-1.15, () => violinPlayer(obj, violin, 'trioViolin', 1, true));
    player(0, () => violinPlayer(obj, viola, 'trioViola', 1.15, true));
    player(1.15, () => cellist(obj, cello, 'trioCello'));
    for (const x of [-1.15, 0, 1.15]) {
        musicStand(obj, x - 0.25, 0.7, 0.72);
    }
}));
