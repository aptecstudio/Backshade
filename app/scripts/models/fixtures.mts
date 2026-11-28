/**
 * Fixture models: the parts that move are separate objects.
 */

import { Obj } from './obj.mts';
import type { Vector } from './vector.mts';

/** Base and yoke of a moving head; the yoke turns for pan */
function mount(obj: Obj): void {
    obj.object('base');
    obj.material('body');
    obj.box([0, 0.08, 0], [0.34, 0.16, 0.34]);
    obj.material('panel');
    obj.box([0, 0.08, 0.171], [0.14, 0.07, 0.004]);
    obj.object('yoke');
    obj.material('body');
    obj.tube([0, 0.16, 0], [0, 0.19, 0], 0.09);
    obj.box([0, 0.215, 0], [0.4, 0.05, 0.14]);
    obj.box([-0.175, 0.35, 0], [0.05, 0.27, 0.12]);
    obj.box([0.175, 0.35, 0], [0.05, 0.27, 0.12]);
}

/** Moving head spot: long head with a medium lens, lens up */
export function movingHead(): Obj {
    const obj = new Obj();
    mount(obj);
    obj.object('head');
    obj.material('body');
    obj.tube([0, 0.34, 0], [0, 0.58, 0], 0.12, 16);
    obj.tube([0, 0.27, 0], [0, 0.34, 0], 0.08, 16, 0.12);
    obj.tube([-0.15, 0.4, 0], [0.15, 0.4, 0], 0.035, 10);
    obj.material('lens');
    obj.tube([0, 0.58, 0], [0, 0.592, 0], 0.095, 16);
    return obj;
}

/** Moving head wash: short wide head with a large flat front */
export function movingWash(): Obj {
    const obj = new Obj();
    mount(obj);
    obj.object('head');
    obj.material('body');
    obj.tube([0, 0.34, 0], [0, 0.5, 0], 0.15, 20);
    obj.tube([0, 0.28, 0], [0, 0.34, 0], 0.08, 20, 0.15);
    obj.tube([-0.15, 0.4, 0], [0.15, 0.4, 0], 0.035, 10);
    obj.material('lens');
    obj.tube([0, 0.5, 0], [0, 0.512, 0], 0.13, 20);
    return obj;
}

/** Moving head beam: narrow head with a ring around a bulging lens */
export function movingBeam(): Obj {
    const obj = new Obj();
    mount(obj);
    obj.object('head');
    obj.material('body');
    obj.tube([0, 0.3, 0], [0, 0.5, 0], 0.1, 16);
    obj.tube([0, 0.5, 0], [0, 0.56, 0], 0.1, 16, 0.12);
    obj.tube([-0.15, 0.4, 0], [0.15, 0.4, 0], 0.035, 10);
    obj.material('lens');
    obj.tube([0, 0.555, 0], [0, 0.575, 0], 0.09, 16, 0.05);
    return obj;
}

/** Side bracket of a fixture that stands on the floor or hangs */
function bracket(obj: Obj, halfWidth: number, height: number): void {
    obj.material('body');
    obj.box([0, 0.01, 0], [halfWidth * 2 + 0.01, 0.02, 0.06]);
    for (const x of [-halfWidth, halfWidth]) {
        obj.box([x, height / 2 + 0.01, 0], [0.012, height, 0.04]);
    }
}

/** PAR can with its bracket, lens towards the front */
export function par(): Obj {
    const obj = new Obj();
    obj.object('par');
    bracket(obj, 0.125, 0.2);
    obj.tube([0, 0.18, -0.1], [0, 0.18, 0.08], 0.11, 16);
    obj.tube([0, 0.18, -0.14], [0, 0.18, -0.1], 0.06, 12, 0.11);
    obj.material('lens');
    obj.tube([0, 0.18, 0.08], [0, 0.18, 0.09], 0.092, 16);
    return obj;
}

/** LED bar of 1 m with its row of lenses towards the front */
export function ledBar(): Obj {
    const obj = new Obj();
    obj.object('bar');
    obj.material('body');
    obj.box([0, 0.09, 0], [1, 0.09, 0.09]);
    for (const x of [-0.4, 0.4]) {
        obj.box([x, 0.025, 0], [0.04, 0.04, 0.07]);
        obj.box([x, 0.006, 0], [0.09, 0.012, 0.12]);
    }
    obj.material('lens');
    for (let lens = 0; lens < 12; lens++) {
        const x = -0.4583 + lens * 0.08333;
        obj.tube([x, 0.09, 0.045], [x, 0.09, 0.052], 0.03, 12);
    }
    return obj;
}

/** Blinder with two lamps side by side */
export function blinder(): Obj {
    const obj = new Obj();
    obj.object('blinder');
    bracket(obj, 0.265, 0.18);
    for (const x of [-0.125, 0.125]) {
        obj.material('body');
        obj.tube([x, 0.18, -0.07], [x, 0.18, 0.06], 0.12, 20);
        obj.material('lens');
        obj.tube([x, 0.18, 0.06], [x, 0.18, 0.068], 0.105, 20);
    }
    return obj;
}

/** Strobe: flat box with a wide tube behind its glass */
export function strobe(): Obj {
    const obj = new Obj();
    obj.object('strobe');
    bracket(obj, 0.235, 0.16);
    obj.box([0, 0.16, 0], [0.45, 0.22, 0.12]);
    obj.material('aluminium');
    obj.box([0, 0.16, 0.061], [0.42, 0.18, 0.004]);
    obj.material('lens');
    obj.box([0, 0.16, 0.065], [0.4, 0.09, 0.008]);
    return obj;
}

/** Follow spot on its tripod, aimed to the front */
export function followSpot(): Obj {
    const obj = new Obj();
    obj.object('spot');
    obj.material('aluminium');
    const hub: Vector = [0, 0.45, 0];
    for (const [x, z] of [[0, 0.45], [-0.39, -0.22], [0.39, -0.22]]) {
        obj.tube([x, 0, z], hub, 0.018, 8);
    }
    obj.tube(hub, [0, 1.2, 0], 0.025, 10);
    obj.material('body');
    obj.box([0, 1.23, 0], [0.1, 0.08, 0.14]);
    obj.tube([0, 1.38, -0.45], [0, 1.38, -0.1], 0.13, 16);
    obj.tube([0, 1.38, -0.1], [0, 1.38, 0.45], 0.1, 16);
    obj.tube([0, 1.38, 0.45], [0, 1.38, 0.52], 0.12, 16);
    obj.tube([-0.13, 1.38, -0.35], [-0.24, 1.38, -0.35], 0.015, 8);
    obj.material('lens');
    obj.tube([0, 1.38, 0.52], [0, 1.38, 0.528], 0.095, 16);
    return obj;
}

/** Flat LED spot hanging under a bar, its seven lenses lit by one material */
function flatSpot(obj: Obj, x: number, y: number, lens: string, lenses: number): void {
    obj.material('body');
    obj.tube([x, y, -0.035], [x, y, 0.028], 0.105, 24);
    obj.box([x, y + 0.115, 0], [0.04, 0.04, 0.03]);
    obj.material('aluminium');
    obj.tube([x, y, 0.026], [x, y, 0.03], 0.092, 24);
    obj.material(lens);
    for (let index = 0; index < lenses; index++) {
        // One in the middle when they are seven, then a ring
        const centred = lenses === 7 && index === 0;
        const angle = (index / (lenses === 7 ? 6 : lenses)) * Math.PI * 2;
        const radius = centred ? 0 : 0.055;
        obj.tube([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 0.028], [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 0.037], 0.022, 14);
    }
}

/** Positions along the bar of the four spots of the Stage Quad, left to right */
export const QUAD_SPOTS = [-0.47, -0.18, 0.18, 0.47] as const;

/** Stairville Stage Quad LED: four flat spots under a bar of 1.2 m */
export function stairvilleQuad(): Obj {
    const obj = new Obj();
    obj.object('bar');
    obj.material('body');
    obj.box([0, 0.285, 0], [1.2, 0.045, 0.05]);
    obj.material('panel');
    obj.box([0, 0.285, 0.027], [0.3, 0.035, 0.004]);
    QUAD_SPOTS.forEach((x, index) => flatSpot(obj, x, 0.13, `lens-${index + 1}`, 7));
    return obj;
}

/** Positions of derby, flood, flood and derby of the BossFx, left to right */
export const BOSS_LIGHTS = [-0.6, -0.22, 0.22, 0.6] as const;

/** Positions of the strobe LEDs along the bar of the BossFx */
export const STROBE_LEDS = [-0.68, -0.4, 0.4, 0.68] as const;

/** Curved front of a derby: centre of its arc behind the housing (Z) and radius */
export const DERBY_FRONT = { z: -0.13, radius: 0.2 } as const;

/** Angles of the six columns of lenses on the curved front, in degrees */
const DERBY_COLUMNS = [-30, -18, -6, 6, 18, 30] as const;

/**
 * Derby in its box: flat sides, curved front with six slots of two lenses,
 * vents on top and the U bracket with its knobs.
 */
function derby(obj: Obj, x: number, y: number, lens: string): void {
    const { z, radius } = DERBY_FRONT;
    const half = 0.13;
    const back = -0.09;
    const top = y + 0.065;
    const bottom = y - 0.065;
    const arc = (degrees: number, distance: number): [number, number] =>
        [x + Math.sin((degrees * Math.PI) / 180) * distance, z + Math.cos((degrees * Math.PI) / 180) * distance];
    // Outline seen from above, the curved front first
    const outline = (distance: number, side: number): Array<[number, number]> => {
        const spread = (Math.asin(side / distance) * 180) / Math.PI;
        const front = Array.from({ length: 13 }, (_, index) => arc(-spread + (index * spread) / 6, distance));
        return [...front, [x + side, back], [x - side, back]];
    };
    obj.material('body');
    // Top and bottom plates around the front, and the housing behind the lenses
    obj.prism(outline(radius, half), top - 0.016, top);
    obj.prism(outline(radius, half), bottom, bottom + 0.016);
    obj.prism(outline(radius - 0.03, half), bottom + 0.016, top - 0.016);
    // The posts between the slots
    for (let post = 0; post <= DERBY_COLUMNS.length; post++) {
        const [px, pz] = arc(-36 + post * 12, radius - 0.003);
        obj.tube([px, bottom, pz], [px, top, pz], 0.0065, 4);
    }
    // Two lenses in every slot, bulging forward
    obj.material(lens);
    for (const column of DERBY_COLUMNS) {
        for (const row of [-0.023, 0.023]) {
            const at = (distance: number): Vector => {
                const [px, pz] = arc(column, distance);
                return [px, y + row, pz];
            };
            obj.loft([
                { at: at(radius - 0.032), width: 0.0155, depth: 0.022 },
                { at: at(radius - 0.014), width: 0.0155, depth: 0.022 },
                { at: at(radius - 0.006), width: 0.011, depth: 0.016 },
                { at: at(radius - 0.003), width: 0.003, depth: 0.004 }
            ], 14, 2);
        }
    }
    // Vents on the top and the screws along the front
    obj.material('dark');
    for (const group of [-0.055, 0.055]) {
        for (let slot = 0; slot < 4; slot++) {
            obj.box([x + group, top + 0.001, -0.065 + slot * 0.016], [0.05, 0.002, 0.007]);
        }
    }
    obj.material('aluminium');
    for (const degrees of [-30, -10, 10, 30]) {
        const [px, pz] = arc(degrees, radius - 0.016);
        obj.tube([px, top, pz], [px, top + 0.004, pz], 0.006, 10);
    }
    // U bracket from the middle of the sides to the bar, with its knobs
    obj.material('body');
    for (const side of [-1, 1]) {
        obj.box([x + side * (half + 0.008), (y + top + 0.055) / 2, -0.025], [0.006, top + 0.055 - y, 0.035]);
        obj.tube([x + side * (half + 0.008), y, -0.025], [x + side * (half + 0.032), y, -0.025], 0.014, 12);
    }
    obj.box([x, top + 0.055, -0.025], [(half + 0.011) * 2, 0.006, 0.035]);
}

/** Stairville LED BossFx-1 Pro: bar of 1.5 m with two derbies, two floods, strobe LEDs and the laser on top */
export function stairvilleBossFx(): Obj {
    const obj = new Obj();
    obj.object('bar');
    obj.material('body');
    obj.box([0, 0.265, 0], [1.5, 0.07, 0.07]);
    // Laser on its bracket
    obj.box([0, 0.365, 0], [0.32, 0.1, 0.13]);
    obj.material('aluminium');
    for (const x of [-0.175, 0.175]) {
        obj.box([x, 0.34, 0], [0.015, 0.09, 0.05]);
    }
    obj.material('dark');
    obj.tube([0, 0.365, 0.065], [0, 0.365, 0.075], 0.028, 16);
    // Laser lens and strobe LEDs set in the front of the bar, each lit by itself
    obj.material('lens-5');
    obj.tube([0, 0.365, 0.074], [0, 0.365, 0.077], 0.018, 14);
    STROBE_LEDS.forEach((x, index) => {
        obj.material(`lens-${index + 6}`);
        obj.tube([x, 0.265, 0.035], [x, 0.265, 0.042], 0.018, 14);
    });
    derby(obj, BOSS_LIGHTS[0], 0.11, 'lens-1');
    flatSpot(obj, BOSS_LIGHTS[1], 0.11, 'lens-2', 6);
    flatSpot(obj, BOSS_LIGHTS[2], 0.11, 'lens-3', 6);
    derby(obj, BOSS_LIGHTS[3], 0.11, 'lens-4');
    return obj;
}
