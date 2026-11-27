/**
 * Moving and glowing parts of the model of a placed fixture: the yoke turns
 * for pan, the head for tilt, the lens takes the color of the light, and a
 * point on the lens tells where the beam starts and goes.
 */

import * as THREE from 'three';
import type { ModelInfo } from './model-library.js';
import { stageMaterial } from './stage-materials.js';

export class StageRig {
    /** On the lens, its +Y along the beam */
    readonly emitter = new THREE.Object3D();
    /** Radius of the lens, in meters */
    readonly radius: number;
    private readonly pan = new THREE.Group();
    private readonly tilt = new THREE.Group();
    private readonly lens = stageMaterial('lens').clone();
    private readonly dark = stageMaterial('lens');

    constructor(private readonly model: THREE.Object3D, info: ModelInfo) {
        const source = info.emitter ?? { position: [0, 0.2, 0], direction: [0, 1, 0], radius: 0.08 };
        this.radius = source.radius;
        this.emitter.position.fromArray(source.position);
        this.emitter.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().fromArray(source.direction));
        this.replaceLens();
        const yoke = model.getObjectByName('yoke');
        const head = model.getObjectByName('head');
        if (info.pivots === undefined || yoke === undefined || head === undefined) {
            model.add(this.emitter);
            return;
        }
        const panPivot = new THREE.Vector3().fromArray(info.pivots.pan);
        const tiltPivot = new THREE.Vector3().fromArray(info.pivots.tilt);
        this.pan.position.copy(panPivot);
        this.tilt.position.copy(tiltPivot).sub(panPivot);
        yoke.position.copy(panPivot).negate();
        head.position.copy(tiltPivot).negate();
        this.emitter.position.sub(tiltPivot);
        this.tilt.add(head, this.emitter);
        this.pan.add(yoke, this.tilt);
        model.add(this.pan);
    }

    /** Turns the yoke and the head, degrees from the centre */
    aim(pan: number, tilt: number): void {
        this.pan.rotation.y = THREE.MathUtils.degToRad(pan);
        this.tilt.rotation.x = THREE.MathUtils.degToRad(tilt);
    }

    /** Lights the lens; zero gives back the look of a fixture that is off */
    glow(color: THREE.Color, level: number): void {
        this.lens.emissive.copy(level > 0 ? color : this.dark.emissive);
        this.lens.emissiveIntensity = level > 0 ? 0.2 + level * 1.4 : 1;
        this.lens.color.copy(level > 0 ? color : this.dark.color).multiplyScalar(level > 0 ? 0.3 : 1);
    }

    private replaceLens(): void {
        this.model.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                if (Array.isArray(object.material)) {
                    object.material = object.material.map((material) => material === this.dark ? this.lens : material);
                } else if (object.material === this.dark) {
                    object.material = this.lens;
                }
            }
        });
    }
}
