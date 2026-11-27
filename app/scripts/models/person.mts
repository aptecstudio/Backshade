/**
 * Standing human figure, male or female, with face, hair, clothes, hands and
 * shoes. Arms are posed by their elbow and wrist, so the same figure serves
 * singers and musicians. The figure faces +Z: its right side is towards -X.
 */

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

/** Shoulder joint of a side (-1 right, 1 left) */
export function shoulderOf(build: Build, side: number): Vector {
    const body = BUILDS[build];
    return [side * body.shoulder, 1.42 * body.scale, -0.01];
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

function hair(obj: Obj, build: Build): void {
    const y = (value: number): number => value * BUILDS[build].scale;
    obj.material('hair');
    if (build === 'male') {
        // Short cut: a cap set back from the forehead
        obj.loft([
            level(y(1.615), 0.045, 0.03, -0.065),
            level(y(1.66), 0.08, 0.07, -0.032),
            level(y(1.705), 0.081, 0.093, -0.012),
            level(y(1.738), 0.062, 0.082, -0.004),
            level(y(1.762), 0.032, 0.048, 0.002),
            level(y(1.766), 0.004, 0.004, 0.002)
        ], 20, 3, true);
        return;
    }
    // Long hair: the cap and the fall behind the shoulders
    obj.loft([
        level(y(1.645), 0.083, 0.062, -0.05),
        level(y(1.7), 0.084, 0.09, -0.018),
        level(y(1.74), 0.065, 0.084, -0.006),
        level(y(1.766), 0.033, 0.05, 0),
        level(y(1.772), 0.004, 0.004, 0)
    ], 20, 3, true);
    obj.loft([
        level(y(1.32), 0.03, 0.012, -0.135),
        level(y(1.4), 0.1, 0.025, -0.13),
        level(y(1.5), 0.092, 0.042, -0.085),
        level(y(1.6), 0.09, 0.055, -0.058),
        level(y(1.67), 0.083, 0.058, -0.045)
    ], 20, 3, true);
    for (const side of [-1, 1]) {
        obj.loft([level(y(1.46), 0.008, 0.008, -0.02, side * 0.07), level(y(1.57), 0.018, 0.03, -0.02, side * 0.08), level(y(1.69), 0.016, 0.045, -0.01, side * 0.072)], 10, 3, true);
    }
}

/** Shirt and trousers, or a knee length dress over the legs */
function body(obj: Obj, build: Build): void {
    const b = BUILDS[build];
    const y = (value: number): number => value * b.scale;
    const female = build === 'female';
    const top = female ? 'dress' : 'clothes';
    obj.material(top);
    const lower = female
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
    if (!female) {
        obj.material('trousers');
        obj.loft([level(y(0.84), 0.1, 0.075), level(y(0.9), b.hip * 0.98, 0.1, -0.006), level(y(0.99), b.hip * 0.96, 0.102)], 20, 3, true);
        obj.material('shoes');
        obj.loft([level(y(0.975), b.hip * 1.02, 0.107), level(y(1.005), b.hip * 1.01, 0.106)], 20, 1, true);
    }
}

function legs(obj: Obj, build: Build): void {
    const b = BUILDS[build];
    const y = (value: number): number => value * b.scale;
    for (const side of [-1, 1]) {
        const x = (value: number): number => side * value;
        obj.material(build === 'female' ? 'figure' : 'trousers');
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

function arm(obj: Obj, build: Build, side: number, pose: Arm): void {
    const k = BUILDS[build].limb;
    const shoulder = shoulderOf(build, side);
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
    obj.material(build === 'female' ? 'dress' : 'clothes');
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

/** Adds the figure to the model */
export function person(obj: Obj, build: Build, right: Arm, left: Arm): void {
    legs(obj, build);
    body(obj, build);
    head(obj, build);
    hair(obj, build);
    arm(obj, build, -1, right);
    arm(obj, build, 1, left);
}
