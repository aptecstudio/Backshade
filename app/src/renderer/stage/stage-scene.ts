/**
 * Keeps the 3D objects of the view equal to the list of stage objects,
 * loading the models they need.
 */

import * as THREE from 'three';
import type { StageObject } from '../../shared/stage/stage.js';
import { loadModel, modelKey, type ModelInfo } from './model-library.js';

interface Entry {
    model: string;
    /** What was drawn: an imported model changes with its unit and axis */
    key: string;
    node: THREE.Group;
    /** Height of the top, for an adjustable stand */
    height: number | null;
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
            const info = this.models.get(object.model);
            const key = info === undefined ? '' : modelKey(info);
            if (entry === undefined || entry.model !== object.model || entry.key !== key) {
                if (entry !== undefined) {
                    this.root.remove(entry.node);
                }
                entry = { model: object.model, key, node: new THREE.Group(), height: object.height };
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
        const entry = this.entries.get(object.id);
        if (entry !== undefined) {
            entry.node.position.set(...object.position);
            entry.node.rotation.set(...object.rotation.map(THREE.MathUtils.degToRad) as [number, number, number]);
            entry.height = object.height;
            this.extend(entry);
        }
    }

    /** Slides the risers of an adjustable stand to its height */
    private extend(entry: Entry): void {
        const lift = this.models.get(entry.model)?.lift;
        if (lift === undefined) {
            return;
        }
        const raised = Math.max(0, Math.min(lift.max, entry.height ?? lift.min) - lift.min);
        const first = entry.node.getObjectByName('riser1');
        const second = entry.node.getObjectByName('riser2');
        if (first !== undefined && second !== undefined) {
            first.position.y = raised / 2;
            second.position.y = raised;
        }
    }

    private async fill(entry: Entry): Promise<void> {
        // A model of a newer version is not drawn, but stays in the show
        const info = this.models.get(entry.model);
        if (info !== undefined) {
            try {
                entry.node.add(await loadModel(info));
                this.extend(entry);
            } catch (error) {
                // An imported file that is missing or broken leaves its place empty
                console.warn(`Model ${entry.model} not drawn`, error);
            }
        }
    }
}
