/**
 * Keeps the 3D objects of the view equal to the list of stage objects,
 * loading the models they need.
 */

import * as THREE from 'three';
import type { StageObject } from '../../shared/stage/stage.js';
import { loadModel, type ModelInfo } from './model-library.js';

interface Entry {
    model: string;
    node: THREE.Group;
}

export class StageScene {
    readonly root = new THREE.Group();
    private readonly entries = new Map<string, Entry>();

    constructor(private readonly models: ReadonlyMap<string, ModelInfo>, private readonly redraw: () => void) {}

    /** The 3D object of a stage object */
    node(id: string): THREE.Group | undefined {
        return this.entries.get(id)?.node;
    }

    /** The stage object a 3D object belongs to */
    idOf(object: THREE.Object3D): string | null {
        for (let current: THREE.Object3D | null = object; current !== null; current = current.parent) {
            if (typeof current.userData.stageId === 'string') {
                return current.userData.stageId;
            }
        }
        return null;
    }

    async sync(objects: readonly StageObject[]): Promise<void> {
        const wanted = new Set(objects.map((object) => object.id));
        for (const [id, entry] of this.entries) {
            if (!wanted.has(id)) {
                this.root.remove(entry.node);
                this.entries.delete(id);
            }
        }
        const loading: Promise<void>[] = [];
        for (const object of objects) {
            let entry = this.entries.get(object.id);
            if (entry === undefined || entry.model !== object.model) {
                if (entry !== undefined) {
                    this.root.remove(entry.node);
                }
                entry = { model: object.model, node: new THREE.Group() };
                entry.node.userData.stageId = object.id;
                this.entries.set(object.id, entry);
                this.root.add(entry.node);
                loading.push(this.fill(entry));
            }
            this.place(object);
        }
        this.redraw();
        await Promise.all(loading);
        this.redraw();
    }

    /** Puts a 3D object where its stage object says */
    place(object: StageObject): void {
        const node = this.node(object.id);
        node?.position.set(...object.position);
        node?.rotation.set(...object.rotation.map(THREE.MathUtils.degToRad) as [number, number, number]);
    }

    private async fill(entry: Entry): Promise<void> {
        // A model of a newer version is not drawn, but stays in the show
        const info = this.models.get(entry.model);
        if (info !== undefined) {
            entry.node.add(await loadModel(info));
        }
    }
}
