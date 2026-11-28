/**
 * Moving and glowing parts of the model of a placed fixture: the yoke turns
 * for pan, the head for tilt, the lens takes the color of the light, and a
 * point on the lens tells where the beam starts and goes.
 */

import * as THREE from 'three';
import type { ModelInfo } from './model-library.js';
import { stageMaterial } from './stage-materials.js';

/** One light of a fixture: where its beam starts, and the lens that glows */
export interface RigLight {
    /** On the lens, its +Y along the beam */
    emitter: THREE.Object3D;
    /** Radius of the lens, in meters */
    radius: number;
    lens: THREE.MeshStandardMaterial;
    kind: 'light' | 'derby' | 'laser' | 'led';
}

const NO_LENS = { position: [0, 0.2, 0], direction: [0, 1, 0], radius: 0.08 } as const;

export class StageRig {
    readonly lights: RigLight[];
    private readonly pan = new THREE.Group();
    private readonly tilt = new THREE.Group();

    constructor(model: THREE.Object3D, info: ModelInfo) {
        const sources = info.emitters ?? [NO_LENS];
        this.lights = sources.map((source, index) => {
            const emitter = new THREE.Object3D();
            emitter.position.fromArray(source.position);
            emitter.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().fromArray(source.direction));
            // A single lens is "lens", several are "lens-1", "lens-2" and so on
            const kind = ('kind' in source ? source.kind : undefined) ?? 'light';
            return { emitter, radius: source.radius, kind, lens: replaceLens(model, sources.length === 1 ? 'lens' : `lens-${index + 1}`) };
        });
        const yoke = model.getObjectByName('yoke');
        const head = model.getObjectByName('head');
        if (info.pivots === undefined || yoke === undefined || head === undefined) {
            model.add(...this.lights.map((light) => light.emitter));
            return;
        }
        const panPivot = new THREE.Vector3().fromArray(info.pivots.pan);
        const tiltPivot = new THREE.Vector3().fromArray(info.pivots.tilt);
        this.pan.position.copy(panPivot);
        this.tilt.position.copy(tiltPivot).sub(panPivot);
        yoke.position.copy(panPivot).negate();
        head.position.copy(tiltPivot).negate();
        this.tilt.add(head);
        for (const { emitter } of this.lights) {
            emitter.position.sub(tiltPivot);
            this.tilt.add(emitter);
        }
        this.pan.add(yoke, this.tilt);
        model.add(this.pan);
    }

    /** Turns the yoke and the head, degrees from the centre */
    aim(pan: number, tilt: number): void {
        this.pan.rotation.y = THREE.MathUtils.degToRad(pan);
        this.tilt.rotation.x = THREE.MathUtils.degToRad(tilt);
    }

    /** Lights a lens; zero gives back the look of a fixture that is off */
    glow(index: number, color: THREE.Color, level: number): void {
        const lens = this.lights[index]?.lens;
        if (lens === undefined) {
            return;
        }
        const off = stageMaterial('lens');
        lens.emissive.copy(level > 0 ? color : off.emissive);
        lens.emissiveIntensity = level > 0 ? 0.2 + level * 1.4 : 1;
        lens.color.copy(level > 0 ? color : off.color).multiplyScalar(level > 0 ? 0.3 : 1);
    }
}

/** Gives this copy of a model its own material for a lens, so it can glow by itself */
function replaceLens(model: THREE.Object3D, name: string): THREE.MeshStandardMaterial {
    const shared = stageMaterial(name);
    const own = shared.clone();
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            if (Array.isArray(object.material)) {
                object.material = object.material.map((material) => material === shared ? own : material);
            } else if (object.material === shared) {
                object.material = own;
            }
        }
    });
    return own;
}
