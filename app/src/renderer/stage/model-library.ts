/**
 * Models bundled with the application: their list and their loading from
 * the .obj files, with the stage materials.
 */

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { fetchJson } from '../../framework/ts/index.js';
import { stageMaterial } from './stage-materials.js';

const FOLDER = '/assets/models';

/** Category of a model */
export type ModelCategory = 'truss' | 'stage' | 'fixtures' | 'musicians' | 'elements';

/** Entry of the model list */
export interface ModelInfo {
    id: string;
    category: ModelCategory;
    file: string;
    /** Lens of a fixture: centre of its face, direction of the beam and radius */
    emitter?: { position: [number, number, number]; direction: [number, number, number]; radius: number };
    /** Length of a truss along X, in meters */
    length?: number;
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

/** A new copy of a model; the file is read once, the geometry is shared */
export async function loadModel(info: ModelInfo): Promise<THREE.Group> {
    let model = loaded.get(info.file);
    if (model === undefined) {
        model = parse(info.file);
        loaded.set(info.file, model);
    }
    return (await model).clone();
}
