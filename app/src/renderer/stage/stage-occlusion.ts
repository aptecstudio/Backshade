/**
 * Where the beams end on the objects they meet. Casting rays against the
 * models is slow, so a distance is kept until its lens moves or turns, and
 * only a few are computed in every frame; the others follow in the next.
 */

import * as THREE from 'three';
import type { StageScene } from './stage-scene.js';

/** Rays computed in a frame */
const BUDGET = 6;

/** Movement that makes a kept distance old: meters, and 1 minus the cosine of about half a degree */
const MOVED = 0.01;
const TURNED = 0.00004;

interface Cast {
    position: THREE.Vector3;
    direction: THREE.Vector3;
    distance: number;
}

export class StageOcclusion {
    private readonly casts = new Map<string, Cast>();
    private readonly ray = new THREE.Raycaster();
    private boxes: Array<{ node: THREE.Object3D; box: THREE.Box3 }> | null = null;
    private left = BUDGET;

    constructor(private readonly scene: StageScene) {}

    /** The stage changed: every distance is computed again */
    clear(): void {
        this.casts.clear();
        this.boxes = null;
    }

    /** Called at every frame */
    refill(): void {
        this.left = BUDGET;
    }

    /**
     * Length of a beam before it meets an object other than its fixture, at
     * most the given one.
     */
    reach(id: string, own: THREE.Object3D | undefined, position: THREE.Vector3, direction: THREE.Vector3, longest: number): number {
        const kept = this.casts.get(id);
        const old = kept === undefined || kept.position.distanceTo(position) > MOVED || 1 - kept.direction.dot(direction) > TURNED;
        if (old && this.left > 0) {
            this.left--;
            const distance = this.cast(own, position, direction, longest);
            this.casts.set(id, { position: position.clone(), direction: direction.clone(), distance });
            return distance;
        }
        return Math.min(longest, kept?.distance ?? longest);
    }

    private cast(own: THREE.Object3D | undefined, position: THREE.Vector3, direction: THREE.Vector3, longest: number): number {
        this.boxes ??= this.scene.root.children.map((node) => ({ node, box: new THREE.Box3().setFromObject(node) }));
        this.ray.set(position, direction);
        this.ray.far = longest;
        const point = new THREE.Vector3();
        // Only the objects whose box is on the way are looked into
        const near = this.boxes.filter(({ node, box }) => node !== own && this.ray.ray.intersectBox(box, point) !== null).map(({ node }) => node);
        return this.ray.intersectObjects(near, true)[0]?.distance ?? longest;
    }
}
