/**
 * Creates the bundled 3D models of the stage (assets/models/*.obj and their
 * list models.json) from simple solids and
 * lofted surfaces (the builders are in models/). Units are meters, Y is up, and the
 * front of an object faces +Z (the audience). Materials are only names
 * (usemtl): the application gives them their look. Run with "npm run models"
 * after changing a model; the files are committed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { deck, drumRiser, stairs } from './models/deck.mts';
import { amp, bassAmp, combo, paSpeaker, subwoofer, wedge } from './models/elements.mts';
import { blinder, BOSS_LIGHTS, DERBY_FRONT, followSpot, ledBar, movingBeam, movingHead, movingWash, par, QUAD_SPOTS, STROBE_LEDS, stairvilleBossFx, stairvilleQuad, strobe } from './models/fixtures.mts';
import { djBooth, guitarStand, keyboardStand, largeCase, micStand, smallCase } from './models/gear.mts';
import { acousticGuitarist, bassist, drummer, guitarist, keyboardist, pianist } from './models/musicians.mts';
import type { Obj } from './models/obj.mts';
import { flutist, harpist, saxophonist, stringTrio, trombonist, trumpeter, violinist } from './models/orchestra.mts';
import type { Build } from './models/person.mts';
import { singer } from './models/singer.mts';
import { WINDUP, windupStand } from './models/stand.mts';
import { basePlate, joint, tower, truss } from './models/truss.mts';
import type { Vector } from './models/vector.mts';

const targetDir = path.join(import.meta.dirname, '..', 'assets', 'models');

interface Model {
    id: string;
    category: 'truss' | 'stage' | 'fixtures' | 'musicians' | 'elements';
    obj: Obj;
    /** Lenses of a fixture from left to right: centre of the face, direction of the beam and radius */
    emitters?: Array<{ position: Vector; direction: Vector; radius: number; kind?: 'derby' | 'laser' | 'led' }>;
    /** Height of the clamp point, for a fixture mounted on a stand */
    mount?: number;
    /** Height of the top of a bar, which hangs without being turned over */
    hang?: number;
    /** Lowest and highest height of the top of an adjustable stand */
    lift?: { min: number; max: number };
    /** Length of a straight truss along X, to hang fixtures on it */
    length?: number;
    /** Arms of a joint to hang on */
    rails?: Array<[Vector, Vector]>;
    /** Height of a tower: fixtures hang on its sides and stand on its top */
    tower?: number;
    /** Points the moving parts turn around */
    pivots?: { pan: Vector; tilt: Vector };
}

/** Moving head with the lens at a height above its base */
const head = (id: string, obj: Obj, lens: number, radius: number): Model => ({
    id, category: 'fixtures', obj, pivots: { pan: [0, 0.16, 0], tilt: [0, 0.4, 0] }, emitters: [{ position: [0, lens, 0], direction: [0, 1, 0], radius }]
});

/** Fixture with a fixed lens towards the front */
const front = (id: string, obj: Obj, y: number, z: number, radius: number): Model => ({
    id, category: 'fixtures', obj, emitters: [{ position: [0, y, z], direction: [0, 0, 1], radius }]
});

/** Bar of several lights towards the front, mounted under its middle or hung by its top */
const bar = (id: string, obj: Obj, lights: readonly number[], y: number, z: number, radius: number, mount: number, hang: number): Model => ({
    id, category: 'fixtures', obj, mount, hang, emitters: lights.map((x) => ({ position: [x, y, z], direction: [0, 0, 1], radius }))
});

/** Joint with an arm of half a meter from its centre towards each direction */
function jointModel(id: string, directions: Array<[number, number]>): Model {
    return { id, category: 'truss', obj: joint(directions), rails: directions.map(([x, z]): [Vector, Vector] => [[0, 0, 0], [x * 0.5, 0, z * 0.5]]) };
}

/** The BossFx: derby, flood, flood, derby, then the laser and the four strobe LEDs */
function bossFx(): Model {
    const model = bar('stairville-bossfx', stairvilleBossFx(), BOSS_LIGHTS, 0.11, 0.07, 0.085, 0.23, 0.415);
    const lights = model.emitters ?? [];
    // The rays of a derby start from the centre of the arc of its front
    for (const light of [lights[0], lights[3]]) {
        light.kind = 'derby';
        light.position = [light.position[0], light.position[1], DERBY_FRONT.z];
        light.radius = DERBY_FRONT.radius;
    }
    const front: Vector = [0, 0, 1];
    lights.push(
        { position: [0, 0.365, 0.077], direction: front, radius: 0.02, kind: 'laser' },
        ...STROBE_LEDS.map((x): NonNullable<Model['emitters']>[number] => ({ position: [x, 0.265, 0.044], direction: front, radius: 0.018, kind: 'led' }))
    );
    return model;
}

/** Every musician exists as a man and as a woman */
const musician = (id: string, make: (build: Build) => Obj): Model[] =>
    (['male', 'female'] as const).map((build) => ({ id: `${id}-${build}`, category: 'musicians', obj: make(build) }));

const MODELS: Model[] = [
    ...[0.5, 1, 2, 3, 4].map((length): Model => ({ id: `truss-${length === 0.5 ? '05' : length}m`, category: 'truss', obj: truss(length), length })),
    jointModel('truss-corner', [[1, 0], [0, 1]]),
    jointModel('truss-t', [[1, 0], [-1, 0], [0, 1]]),
    jointModel('truss-cross', [[1, 0], [-1, 0], [0, 1], [0, -1]]),
    { id: 'truss-base', category: 'truss', obj: basePlate() },
    { id: 'tower-3m', category: 'truss', obj: tower(3), tower: 3 },
    { id: 'tower-4m', category: 'truss', obj: tower(4), tower: 4 },
    { id: 'deck-1x1', category: 'stage', obj: deck(1, 1, 0.4) },
    { id: 'deck-2x1', category: 'stage', obj: deck(2, 1, 0.4) },
    { id: 'deck-2x1-high', category: 'stage', obj: deck(2, 1, 1) },
    { id: 'drum-riser', category: 'stage', obj: drumRiser() },
    { id: 'stairs-40', category: 'stage', obj: stairs(0.4) },
    { id: 'stairs-100', category: 'stage', obj: stairs(1) },
    head('moving-head', movingHead(), 0.593, 0.09),
    head('moving-head-wash', movingWash(), 0.513, 0.13),
    head('moving-head-beam', movingBeam(), 0.576, 0.05),
    front('par', par(), 0.18, 0.091, 0.09),
    front('led-bar', ledBar(), 0.09, 0.053, 0.2),
    front('blinder', blinder(), 0.18, 0.069, 0.2),
    front('strobe', strobe(), 0.16, 0.07, 0.15),
    front('follow-spot', followSpot(), 1.38, 0.529, 0.095),
    bar('stairville-quad', stairvilleQuad(), QUAD_SPOTS, 0.13, 0.038, 0.08, 0.262, 0.308),
    bossFx(),
    ...musician('singer', singer),
    ...musician('guitarist', guitarist),
    ...musician('guitarist-acoustic', acousticGuitarist),
    ...musician('bassist', bassist),
    ...musician('drummer', drummer),
    ...musician('keyboardist', keyboardist),
    ...musician('pianist', pianist),
    ...musician('harpist', harpist),
    ...musician('violinist', violinist),
    ...musician('trumpeter', trumpeter),
    ...musician('trombonist', trombonist),
    ...musician('saxophonist', saxophonist),
    ...musician('flutist', flutist),
    ...musician('string-trio', (build) => stringTrio(build)),
    { id: 'string-trio-mixed', category: 'musicians', obj: stringTrio('female', 'male', 'female') },
    { id: 'windup-stand', category: 'elements', obj: windupStand(), lift: WINDUP },
    { id: 'amp', category: 'elements', obj: amp() },
    { id: 'guitar-combo', category: 'elements', obj: combo() },
    { id: 'bass-amp', category: 'elements', obj: bassAmp() },
    { id: 'wedge', category: 'elements', obj: wedge() },
    { id: 'pa-speaker', category: 'elements', obj: paSpeaker() },
    { id: 'subwoofer', category: 'elements', obj: subwoofer() },
    { id: 'mic-stand', category: 'elements', obj: micStand() },
    { id: 'keyboard-stand', category: 'elements', obj: keyboardStand() },
    { id: 'guitar-stand', category: 'elements', obj: guitarStand() },
    { id: 'case-small', category: 'elements', obj: smallCase() },
    { id: 'case-large', category: 'elements', obj: largeCase() },
    { id: 'dj-booth', category: 'elements', obj: djBooth() }
];

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
for (const model of MODELS) {
    fs.writeFileSync(path.join(targetDir, `${model.id}.obj`), model.obj.text());
}
const list = MODELS.map(({ id, category, obj, ...data }) => ({ id, category, file: `${id}.obj`, width: obj.width, ...data }));
fs.writeFileSync(path.join(targetDir, 'models.json'), `${JSON.stringify(list, null, 4)}\n`);
console.log(`Models written: ${MODELS.length}`);
