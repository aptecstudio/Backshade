/**
 * Standing human figure, male or female, with face, hair, clothes, hands and
 * shoes. Arms are posed by their elbow and wrist, and the legs of a seated
 * figure by their knee and ankle, so the same figure serves singers and
 * musicians. The figure faces +Z: its right side is towards -X.
 */

import type { Look } from './looks.mts';
import type { Obj, Section } from './obj.mts';
import { add, scale, sub, unit, type Vector } from './vector.mts';

export type Build = 'male' | 'female';

/** Arm of a pose, from the shoulder down */
export interface Arm {
    elbow: Vector;
    wrist: Vector;
    /** Tip of the closed or open hand */
    hand: Vector;
    /** Fingers curled around something */
    grip: boolean;
}

/** Leg of a seated figure */
export interface Leg {
    knee: Vector;
    ankle: Vector;
}

export interface Pose {
    /** How much a seated figure is lowered from standing, in meters */
    drop?: number;
    /** Legs of a seated figure, right then left; standing legs without them */
    legs?: [Leg, Leg];
}

/** Measures that tell the two builds apart, in meters */
const BUILDS = {
    male: { scale: 1, shoulder: 0.2, chest: 0.165, waist: 0.14, hip: 0.155, neck: 0.056, limb: 1 },
    female: { scale: 0.955, shoulder: 0.172, chest: 0.135, waist: 0.108, hip: 0.165, neck: 0.044, limb: 0.86 }
} as const;

/** Section from height, half width, half depth and forward shift */
const level = (y: number, width: number, depth: number, z = 0, x = 0): Section => ({ at: [x, y, z], width, depth });

/** Section on a limb, round */
const round = (at: Vector, radius: number): Section => ({ at, width: radius, depth: radius });

const between = (a: Vector, b: Vector, t: number): Vector => add(a, scale(sub(b, a), t));

/** Where the mouth of a figure is, to place a microphone */
export function mouthOf(build: Build): Vector {
    return [0, 1.585 * BUILDS[build].scale, 0.098];
}

/** Shoulder joint of a side (-1 right, 1 left), lowered by the drop of a seated figure */
export function shoulderOf(build: Build, side: number, drop = 0): Vector {
    const body = BUILDS[build];
    return [side * body.shoulder, 1.42 * body.scale - drop, -0.01];
}

/** Hip joint of a side of a seated figure */
export function hipOf(build: Build, side: number, drop: number): Vector {
    return [side * 0.09, 0.9 * BUILDS[build].scale - drop, -0.005];
}

function head(obj: Obj, build: Build): void {
    const s = BUILDS[build].scale;
    const narrow = build === 'female' ? 0.93 : 1;
    const y = (value: number): number => value * s;
    obj.material('figure');
    // Neck, then the head from the chin to the crown
    obj.loft([level(y(1.46), BUILDS[build].neck, BUILDS[build].neck, -0.012), level(y(1.57), BUILDS[build].neck * 0.92, BUILDS[build].neck, 0)], 14, 3, true);
    obj.loft([
        level(y(1.538), 0.012, 0.014, 0.07),
        level(y(1.552), 0.045 * narrow, 0.045, 0.042),
        level(y(1.585), 0.062 * narrow, 0.076, 0.02),
        level(y(1.63), 0.074 * narrow, 0.09, 0.008),
        level(y(1.675), 0.077 * narrow, 0.094, 0),
        level(y(1.72), 0.066 * narrow, 0.082, -0.004),
        level(y(1.748), 0.035, 0.045, -0.006),
        level(y(1.755), 0.004, 0.004, -0.006)
    ], 20, 3, true);
    // Nose, ears, eyes, eyebrows and mouth
    obj.loft([level(y(1.652), 0.007, 0.006, 0.096), level(y(1.628), 0.01, 0.012, 0.1), level(y(1.611), 0.016, 0.013, 0.098), level(y(1.604), 0.007, 0.006, 0.092)], 10, 3, true);
    for (const side of [-1, 1]) {
        obj.loft([level(y(1.605), 0.004, 0.008, -0.004, side * 0.073 * narrow), level(y(1.632), 0.009, 0.019, -0.006, side * 0.078 * narrow), level(y(1.662), 0.004, 0.01, -0.006, side * 0.077 * narrow)], 10, 3, true);
    }
    obj.material('dark');
    for (const side of [-1, 1]) {
        obj.ball([side * 0.027, y(1.65), 0.089], 0.0085, 10, 6);
        obj.tube([side * 0.012, y(1.672), 0.094], [side * 0.045, y(1.671), 0.085], build === 'female' ? 0.0025 : 0.004, 6);
    }
    obj.material('lips');
    obj.loft([round([-0.022, y(1.585), 0.092], 0.002), round([0, y(1.585), 0.099], build === 'female' ? 0.0075 : 0.0055), round([0.022, y(1.585), 0.092], 0.002)], 8, 3);
}

/** Cap of hair over the skull: how much it stands out from the head */
function cap(obj: Obj, build: Build, volume: number, back: number): void {
    const y = (value: number): number => value * BUILDS[build].scale;
    obj.loft([
        level(y(1.615), 0.045 * volume, 0.03, -0.065 - back),
        level(y(1.66), 0.08 * volume, 0.07 * volume, -0.032 - back),
        level(y(1.705), 0.081 * volume, 0.093 * volume, -0.012 - back),
        level(y(1.738), 0.062 * volume, 0.082 * volume, -0.004 - back),
        level(y(1.762 + (volume - 1) * 0.08), 0.032 * volume, 0.048 * volume, 0.002 - back),
        level(y(1.766 + (volume - 1) * 0.1), 0.004, 0.004, 0.002 - back)
    ], 20, 3, true);
}

/** Hair falling behind the head down to a height, with the locks at the sides */
function fall(obj: Obj, build: Build, bottom: number, locks: number): void {
    const y = (value: number): number => value * BUILDS[build].scale;
    obj.loft([
        level(y(bottom), 0.03, 0.012, -0.135),
        level(y(bottom + 0.08), 0.1, 0.025, -0.13),
        level(y(1.5 + (bottom - 1.32) * 0.3), 0.092, 0.042, -0.085),
        level(y(1.6), 0.09, 0.055, -0.058),
        level(y(1.67), 0.083, 0.058, -0.045)
    ], 20, 3, true);
    for (const side of [-1, 1]) {
        obj.loft([level(y(locks), 0.008, 0.008, -0.02, side * 0.07), level(y((locks + 1.69) / 2), 0.018, 0.03, -0.02, side * 0.08), level(y(1.69), 0.016, 0.045, -0.01, side * 0.072)], 10, 3, true);
    }
}

function hair(obj: Obj, build: Build, look: Look): void {
    const y = (value: number): number => value * BUILDS[build].scale;
    if (look.hair === 'bald') {
        return;
    }
    obj.material(look.hairColor);
    switch (look.hair) {
        case 'buzz':
            cap(obj, build, 0.97, -0.002);
            break;
        case 'short':
            cap(obj, build, 1, 0);
            break;
        case 'quiff':
            cap(obj, build, 1.03, 0);
            obj.loft([level(y(1.73), 0.05, 0.03, 0.055), level(y(1.775), 0.055, 0.045, 0.045), level(y(1.795), 0.02, 0.02, 0.03)], 16, 3, true);
            break;
        case 'curly':
            cap(obj, build, 1.06, 0.004);
            for (let ring = 0; ring < 4; ring++) {
                const height = 1.785 - ring * 0.036;
                const radius = [0.035, 0.07, 0.088, 0.09][ring];
                const count = [5, 10, 13, 13][ring];
                for (let curl = 0; curl < count; curl++) {
                    const angle = ((curl + ring * 0.5) / count) * Math.PI * 2;
                    const z = Math.cos(angle) * radius - 0.012;
                    // No curls over the face
                    if (ring < 2 || z < 0.035) {
                        obj.ball([Math.sin(angle) * radius, y(height), z], 0.024, 8, 5);
                    }
                }
            }
            break;
        case 'bob':
            cap(obj, build, 1.07, 0.006);
            fall(obj, build, 1.52, 1.55);
            break;
        case 'long':
            cap(obj, build, 1.05, 0.006);
            fall(obj, build, 1.32, 1.46);
            break;
        case 'ponytail':
            cap(obj, build, 1.02, 0.002);
            obj.ball([0, y(1.69), -0.108], 0.028, 12, 8);
            obj.loft([round([0, y(1.69), -0.11], 0.026), round([0, y(1.62), -0.155], 0.036), round([0, y(1.5), -0.14], 0.026), round([0, y(1.42), -0.125], 0.006)], 12, 3);
            break;
        case 'bun':
            cap(obj, build, 1.02, 0.002);
            obj.ball([0, y(1.72), -0.105], 0.048, 14, 10);
            break;
    }
}

/** Shirt and trousers, or a knee length dress over the legs */
function body(obj: Obj, build: Build, dressed: boolean, look: Look): void {
    const b = BUILDS[build];
    const y = (value: number): number => value * b.scale;
    const female = build === 'female';
    obj.material(look.top);
    const lower = dressed
        ? [level(y(0.55), 0.18, 0.125), level(y(0.72), 0.17, 0.12), level(y(0.9), b.hip * 1.03, 0.118, -0.008), level(y(1), b.hip * 0.9, 0.096)]
        : [level(y(0.95), b.hip, 0.1)];
    obj.loft([
        ...lower,
        level(y(1.08), b.waist, female ? 0.082 : 0.095),
        level(y(1.2), b.chest * 0.94, 0.098, female ? 0.012 : 0),
        level(y(1.29), b.chest, female ? 0.108 : 0.115, female ? 0.022 : 0.004),
        level(y(1.38), b.chest * 1.08, 0.098, -0.002),
        level(y(1.45), b.shoulder * 0.98, 0.075, -0.01),
        level(y(1.49), b.neck * 1.7, 0.062, -0.014),
        level(y(1.505), b.neck * 1.2, b.neck * 1.2, -0.01)
    ], 20, 3, true);
    if (!dressed) {
        obj.material(look.bottom);
        obj.loft([level(y(0.84), 0.1, 0.075), level(y(0.9), b.hip * 0.98, 0.1, -0.006), level(y(0.99), b.hip * 0.96, 0.102)], 20, 3, true);
        obj.material('shoes');
        obj.loft([level(y(0.975), b.hip * 1.02, 0.107), level(y(1.005), b.hip * 1.01, 0.106)], 20, 1, true);
    }
}

/** Shoe flat on the floor under an ankle, pointing forward */
function shoe(obj: Obj, build: Build, ankle: Vector): void {
    const k = BUILDS[build].limb;
    const [x, y, z] = ankle;
    const low = y - 0.09;
    obj.material('shoes');
    obj.loft([
        round([x, low + 0.045, z - 0.065], 0.012),
        { at: [x, low + 0.05, z - 0.04], width: 0.046 * k, depth: 0.048 },
        { at: [x, low + 0.05, z + 0.03], width: 0.05 * k, depth: 0.048 },
        { at: [x, low + 0.036, z + 0.1], width: 0.05 * k, depth: 0.034 },
        { at: [x, low + 0.027, z + 0.15], width: 0.038 * k, depth: 0.024 },
        round([x, low + 0.024, z + 0.17], 0.008)
    ], 10, 2);
}

/** Legs bent as given, for who sits */
function seatedLegs(obj: Obj, build: Build, drop: number, pose: [Leg, Leg], look: Look): void {
    const k = BUILDS[build].limb;
    [-1, 1].forEach((side, index) => {
        const hip = hipOf(build, side, drop);
        const { knee, ankle } = pose[index];
        obj.material(look.bottom);
        obj.loft([round(hip, 0.082), round(between(hip, knee, 0.5), 0.07 * k), round(knee, 0.056 * k)], 12, 3);
        obj.ball(knee, 0.056 * k, 10, 6);
        obj.loft([round(knee, 0.054 * k), round(between(knee, ankle, 0.35), 0.056 * k), round(ankle, 0.037 * k)], 12, 3);
        shoe(obj, build, ankle);
    });
}

function legs(obj: Obj, build: Build, dressed: boolean, look: Look): void {
    const b = BUILDS[build];
    const y = (value: number): number => value * b.scale;
    for (const side of [-1, 1]) {
        const x = (value: number): number => side * value;
        obj.material(dressed ? 'figure' : look.bottom);
        const k = b.limb;
        obj.loft([
            level(y(0.09), 0.036 * k, 0.04 * k, -0.01, x(0.105)),
            level(y(0.2), 0.043 * k, 0.047 * k, -0.012, x(0.104)),
            level(y(0.36), 0.057 * k, 0.062 * k, -0.016, x(0.1)),
            level(y(0.5), 0.052 * k, 0.055 * k, 0, x(0.097)),
            level(y(0.68), 0.064 * k, 0.069 * k, 0, x(0.09)),
            level(y(0.9), 0.07, 0.08, -0.005, x(0.078))
        ], 14, 3);
        // Shoes from the heel to the toe; women wear a short boot
        obj.material('shoes');
        const toe = build === 'female' ? 0.12 : 0.145;
        obj.loft([
            round([x(0.108), 0.045, -0.075], 0.012),
            { at: [x(0.108), 0.05, -0.05], width: 0.046 * k, depth: 0.048 },
            { at: [x(0.11), 0.05, 0.02], width: 0.05 * k, depth: 0.048 },
            { at: [x(0.114), 0.036, 0.09], width: 0.052 * k, depth: 0.034 },
            { at: [x(0.117), 0.027, toe], width: 0.038 * k, depth: 0.024 },
            round([x(0.117), 0.024, toe + 0.018], 0.008)
        ], 12, 3);
        obj.loft([level(y(0.05), 0.046 * k, 0.052, -0.02, x(0.107)), level(y(build === 'female' ? 0.19 : 0.12), 0.046 * k, 0.052 * k, -0.012, x(0.105))], 12, 2);
    }
}

function arm(obj: Obj, build: Build, side: number, pose: Arm, drop: number, look: Look): void {
    const k = BUILDS[build].limb;
    const shoulder = shoulderOf(build, side, drop);
    const sleeve = between(shoulder, pose.elbow, build === 'female' ? 0.28 : 0.72);
    obj.material('figure');
    obj.loft([
        round(shoulder, 0.05 * k),
        round(between(shoulder, pose.elbow, 0.45), 0.045 * k),
        round(pose.elbow, 0.034 * k),
        round(between(pose.elbow, pose.wrist, 0.3), 0.038 * k),
        round(pose.wrist, 0.023 * k)
    ], 12, 3);
    // Sleeve over the shoulder: short for him, shorter for her
    obj.material(look.top);
    obj.ball(add(shoulder, [-side * 0.006, -0.008, 0]), 0.058 * k, 12, 8);
    obj.loft([round(shoulder, 0.056 * k), round(between(shoulder, sleeve, 0.55), 0.052 * k), round(sleeve, 0.047 * k)], 12, 3);
    hand(obj, side, pose, k);
}

function hand(obj: Obj, side: number, pose: Arm, k: number): void {
    const direction = unit(sub(pose.hand, pose.wrist));
    const along = (length: number): Vector => add(pose.wrist, scale(direction, length * k));
    obj.material('figure');
    obj.loft([
        { at: pose.wrist, width: 0.024 * k, depth: 0.018 * k },
        { at: along(0.035), width: 0.04 * k, depth: 0.018 * k },
        { at: along(0.08), width: 0.04 * k, depth: 0.015 * k }
    ], 12, 3);
    // Four fingers, straight or curled towards the middle of the body, and the thumb
    const curl: Vector = pose.grip ? [-side * 0.03 * k, -0.004, 0.012] : [0, 0, 0.004];
    const across: Vector = Math.abs(direction[1]) > 0.7 ? [0, 0, 1] : [0, 1, 0];
    for (let finger = 0; finger < 4; finger++) {
        const offset = scale(across, (finger - 1.5) * 0.017 * k);
        const root = add(along(0.075), offset);
        const joint = add(add(along(pose.grip ? 0.1 : 0.115), offset), scale(curl, 0.5));
        const tip = add(add(along(pose.grip ? 0.095 : 0.15), offset), curl);
        obj.loft([round(root, 0.0095 * k), round(joint, 0.0088 * k), round(tip, 0.0065 * k)], 8, 3);
    }
    const thumb = add(along(0.028), scale(across, 0.032 * k));
    obj.loft([round(thumb, 0.013 * k), round(add(add(along(0.07), scale(across, 0.046 * k)), scale(curl, 0.4)), 0.0085 * k)], 8, 2);
}

/** Adds the figure to the model; the arms are given where they end up, also for who sits */
export function person(obj: Obj, build: Build, look: Look, right: Arm, left: Arm, pose: Pose = {}): void {
    // Who sits wears trousers
    const dressed = build === 'female' && look.dress === true && pose.legs === undefined;
    const drop = pose.drop ?? 0;
    if (pose.legs === undefined) {
        legs(obj, build, dressed, look);
    } else {
        seatedLegs(obj, build, drop, pose.legs, look);
    }
    obj.within([0, -drop, 0], () => {
        body(obj, build, dressed, look);
        head(obj, build);
        hair(obj, build, look);
    });
    arm(obj, build, -1, right, drop, look);
    arm(obj, build, 1, left, drop, look);
}
