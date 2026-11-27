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
import { deck } from './models/deck.mts';
import { amp, wedge } from './models/elements.mts';
import { movingHead, par } from './models/fixtures.mts';
import type { Obj } from './models/obj.mts';
import { singer } from './models/singer.mts';
import { truss } from './models/truss.mts';
import type { Vector } from './models/vector.mts';

const targetDir = path.join(import.meta.dirname, '..', 'assets', 'models');

interface Model {
    id: string;
    category: 'truss' | 'stage' | 'fixtures' | 'musicians' | 'elements';
    obj: Obj;
    /** Points the moving parts turn around */
    pivots?: { pan: Vector; tilt: Vector };
}

const MODELS: Model[] = [
    { id: 'truss-1m', category: 'truss', obj: truss(1) },
    { id: 'truss-2m', category: 'truss', obj: truss(2) },
    { id: 'truss-3m', category: 'truss', obj: truss(3) },
    { id: 'deck-2x1', category: 'stage', obj: deck(0.4) },
    { id: 'moving-head', category: 'fixtures', obj: movingHead(), pivots: { pan: [0, 0.16, 0], tilt: [0, 0.4, 0] } },
    { id: 'par', category: 'fixtures', obj: par() },
    { id: 'singer-male', category: 'musicians', obj: singer('male') },
    { id: 'singer-female', category: 'musicians', obj: singer('female') },
    { id: 'wedge', category: 'elements', obj: wedge() },
    { id: 'amp', category: 'elements', obj: amp() }
];

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
for (const model of MODELS) {
    fs.writeFileSync(path.join(targetDir, `${model.id}.obj`), model.obj.text());
}
const list = MODELS.map(({ id, category, pivots }) => ({ id, category, file: `${id}.obj`, ...(pivots === undefined ? {} : { pivots }) }));
fs.writeFileSync(path.join(targetDir, 'models.json'), `${JSON.stringify(list, null, 4)}\n`);
console.log(`Models written: ${MODELS.length}`);
