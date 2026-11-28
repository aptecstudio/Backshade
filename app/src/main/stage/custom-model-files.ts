/**
 * Files of the models imported into a show: reading and measuring an .obj
 * chosen by the user, copying it with its .mtl into the show, and reading
 * them back for the stage window.
 */

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { MODEL_MAX_BYTES, MODELS_FOLDER } from '../../shared/stage/custom-model';
import { EngineError } from '../transport/engine-error';

export interface InspectedModel {
    /** Size along X, Y and Z as written in the file */
    size: [number, number, number];
    /** Name proposed: the one of the file */
    name: string;
    /** The material file it asks for, when it is beside it */
    materials: string | null;
}

function readText(file: string): string {
    if (fs.statSync(file).size > MODEL_MAX_BYTES) {
        throw new EngineError('model-too-large', 'The model is too large');
    }
    return fs.readFileSync(file, 'utf8');
}

export function inspectModel(file: string): InspectedModel {
    const low = [Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity];
    let faces = 0;
    let materials: string | null = null;
    for (const line of readText(file).split('\n')) {
        const [keyword, ...rest] = line.trim().split(/\s+/);
        if (keyword === 'v') {
            for (let axis = 0; axis < 3; axis++) {
                const value = Number(rest[axis]);
                if (Number.isFinite(value)) {
                    low[axis] = Math.min(low[axis], value);
                    high[axis] = Math.max(high[axis], value);
                }
            }
        } else if (keyword === 'f') {
            faces++;
        } else if (keyword === 'mtllib' && materials === null) {
            // Only a file beside the model is taken
            const beside = path.join(path.dirname(file), path.basename(rest.join(' ')));
            materials = fs.existsSync(beside) && fs.statSync(beside).isFile() ? beside : null;
        }
    }
    if (faces === 0 || !low.every(Number.isFinite)) {
        throw new EngineError('model-invalid', 'Not a model with faces');
    }
    return { size: low.map((value, axis) => high[axis] - value) as InspectedModel['size'], name: path.basename(file, path.extname(file)), materials };
}

const modelFile = (showFolder: string, id: string, extension: 'obj' | 'mtl'): string => path.join(showFolder, MODELS_FOLDER, `${id}.${extension}`);

/** Files of a model inside a show */
export const modelFiles = (showFolder: string, id: string): string[] =>
    [modelFile(showFolder, id, 'obj'), modelFile(showFolder, id, 'mtl')].filter((file) => fs.existsSync(file));

/** Copies a model into the show and returns its identifier */
export function storeModel(showFolder: string, file: string, materials: string | null): string {
    const id = `custom-${randomBytes(8).toString('hex')}`;
    fs.mkdirSync(path.join(showFolder, MODELS_FOLDER), { recursive: true });
    fs.copyFileSync(file, modelFile(showFolder, id, 'obj'));
    if (materials !== null) {
        readText(materials);
        fs.copyFileSync(materials, modelFile(showFolder, id, 'mtl'));
    }
    return id;
}

export function readModel(showFolder: string, id: string): { obj: string; mtl: string | null } {
    const obj = modelFile(showFolder, id, 'obj');
    if (!fs.existsSync(obj)) {
        throw new EngineError('file-not-found', 'The file of the model is missing');
    }
    const mtl = modelFile(showFolder, id, 'mtl');
    return { obj: readText(obj), mtl: fs.existsSync(mtl) ? readText(mtl) : null };
}

export function deleteModel(showFolder: string, id: string): void {
    modelFiles(showFolder, id).forEach((file) => fs.rmSync(file, { force: true }));
}
