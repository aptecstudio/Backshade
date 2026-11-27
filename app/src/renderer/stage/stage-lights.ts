/**
 * Light of the fixtures on the stage surfaces: a fixed number of spot
 * lights, given to the brightest fixtures. Their number is fixed because
 * changing it rebuilds the shaders; the quality level chooses it.
 */

import * as THREE from 'three';

export interface Spot {
    position: THREE.Vector3;
    direction: THREE.Vector3;
    color: THREE.Color;
    /** 0 to 1 */
    level: number;
    /** Beam angle in degrees */
    angle: number;
    lumens: number;
}

export class StageLights {
    readonly root = new THREE.Group();
    private pool: THREE.SpotLight[] = [];

    resize(count: number): void {
        if (count === this.pool.length) {
            return;
        }
        this.pool.forEach((light) => light.dispose());
        this.root.clear();
        this.pool = Array.from({ length: count }, () => {
            const light = new THREE.SpotLight(0xffffff, 0, 30, Math.PI / 8, 0.5, 1.4);
            this.root.add(light, light.target);
            return light;
        });
    }

    set(spots: readonly Spot[]): void {
        const strength = (spot: Spot): number => spot.level * spot.lumens;
        const brightest = [...spots].filter((spot) => spot.level > 0).sort((a, b) => strength(b) - strength(a));
        this.pool.forEach((light, index) => {
            const spot = brightest[index];
            if (spot === undefined) {
                light.intensity = 0;
                return;
            }
            light.position.copy(spot.position);
            light.target.position.copy(spot.position).add(spot.direction);
            light.color.copy(spot.color);
            light.angle = THREE.MathUtils.degToRad(Math.max(4, Math.min(spot.angle, 120)) / 2);
            // A narrow beam concentrates the same light
            const focus = Math.min(4, Math.sqrt(25 / Math.max(3, spot.angle)));
            light.intensity = spot.level * focus * Math.sqrt(spot.lumens / 3000) * 45;
        });
    }
}
