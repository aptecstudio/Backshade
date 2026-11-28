/**
 * Light of the fixtures on the stage surfaces: a fixed number of spot
 * lights, given to the brightest fixtures. Their number is fixed because
 * changing it rebuilds the shaders; the quality level chooses it. With
 * shadows on, the first lights, the brightest, cast them.
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
    /** Softness of the edge, 0 to 1 */
    soft?: number;
}

/** Lights that cast shadows: each one draws the stage once more */
export const SHADOW_LIGHTS = 4;

export class StageLights {
    readonly root = new THREE.Group();
    private pool: THREE.SpotLight[] = [];

    private shadows = false;

    /**
     * @param shadows - The first lights cast shadows
     */
    resize(count: number, shadows = false): void {
        if (count === this.pool.length && shadows === this.shadows) {
            return;
        }
        this.shadows = shadows;
        this.pool.forEach((light) => light.dispose());
        this.root.clear();
        this.pool = Array.from({ length: count }, (_, index) => {
            const light = new THREE.SpotLight(0xffffff, 0, 30, Math.PI / 8, 0.5, 1.4);
            light.castShadow = shadows && index < SHADOW_LIGHTS;
            light.shadow.mapSize.set(1024, 1024);
            light.shadow.bias = -0.0005;
            light.shadow.camera.near = 0.2;
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
            light.penumbra = 0.2 + 0.8 * (spot.soft ?? 0.35);
            light.angle = THREE.MathUtils.degToRad(Math.max(4, Math.min(spot.angle, 120)) / 2);
            // A narrow beam concentrates the same light
            const focus = Math.min(4, Math.sqrt(25 / Math.max(3, spot.angle)));
            light.intensity = spot.level * focus * Math.sqrt(spot.lumens / 3000) * 45;
        });
    }
}
