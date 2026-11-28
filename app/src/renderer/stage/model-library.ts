/**
 * Models bundled with the application: their list and their loading from
 * the .obj files, with the stage materials.
 */

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { fetchJson } from '../../framework/ts/index.js';
import type { CustomModel } from '../../shared/stage/custom-model.js';
import { loadCustomModel } from './custom-model-loader.js';
import { stageMaterial } from './stage-materials.js';

const FOLDER = '/assets/models';

/** Category of a model */
export type ModelCategory = 'truss' | 'stage' | 'fixtures' | 'musicians' | 'elements' | 'custom';

/** Entry of the model list */
export interface ModelInfo {
    id: string;
    category: ModelCategory;
    file: string;
    /** Size along X, in meters */
    width: number;
    /** Lenses of a fixture from left to right: centre of the face, direction of the beam and radius */
    emitters?: Array<{
        position: [number, number, number];
        direction: [number, number, number];
        radius: number;
        /** A colored light when not given: derby of several beams, laser or strobe LED */
        kind?: 'derby' | 'laser' | 'led';
    }>;
    /** Height of the clamp point above the origin, for a fixture mounted on a stand */
    mount?: number;
    /** Height of the top of a bar above the origin: it hangs under a truss without being turned over */
    hang?: number;
    /** Adjustable stand: lowest and highest height of its top, in meters */
    lift?: { min: number; max: number };
    /** Length of a truss along X, in meters */
    length?: number;
    /** Arms of a truss joint to hang on, each from one end to the other */
    rails?: Array<[[number, number, number], [number, number, number]]>;
    /** Height of a tower: fixtures hang on its sides and stand on its top */
    tower?: number;
    /** A model imported into the show, without a bundled file */
    custom?: CustomModel;
    /** Points the moving parts of a fixture turn around */
    pivots?: { pan: [number, number, number]; tilt: [number, number, number] };
}

export function listModels(): Promise<ModelInfo[]> {
    return fetchJson(`${FOLDER}/models.json`) as Promise<ModelInfo[]>;
}

const loaded = new Map<string, Promise<THREE.Group>>();

async function parse(file: string): Promise<THREE.Group> {
    const answer = await fetch(`${FOLDER}/${file}`);
    if (!answer.ok) {
        throw new Error(`Model not found: ${file}`);
    }
    const group = new OBJLoader().parse(await answer.text());
    group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            const styled = materials.map((material) => stageMaterial(material.name));
            object.material = Array.isArray(object.material) ? styled : styled[0];
            // Imported files may come without normals
            if (object.geometry.getAttribute('normal') === undefined) {
                object.geometry.computeVertexNormals();
            }
        }
    });
    return group;
}

/** Changes when what is drawn for a model changes */
export function modelKey(info: ModelInfo): string {
    return info.custom === undefined ? info.file : `${info.custom.id} ${info.custom.unit} ${info.custom.up}`;
}

/** A new copy of a model; the file is read once, the geometry is shared */
export async function loadModel(info: ModelInfo): Promise<THREE.Group> {
    const key = modelKey(info);
    let model = loaded.get(key);
    if (model === undefined) {
        model = info.custom === undefined ? parse(info.file) : loadCustomModel(info.custom);
        loaded.set(key, model);
        // A file that could not be read is tried again
        model.catch(() => loaded.delete(key));
    }
    return (await model).clone();
}
