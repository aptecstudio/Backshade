/**
 * Light of the fixtures on the stage surfaces: a fixed number of spot
 * lights, given to the brightest fixtures. Their number is fixed because
 * changing it rebuilds the shaders; the quality level chooses it. With
 * shadows on, the first lights cast them and can project a gobo, which
 * objects then stop: the library allows only a few such lights.
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
    /** Picture of the gobo or prism pattern in front of the light */
    gobo?: THREE.Texture;
    /** Width of the whole pattern in degrees */
    cone?: number;
}

/** Lights that cast shadows: each one draws the stage once more */
export const SHADOW_LIGHTS = 4;

/** Picture that lets everything through, for the lights without a gobo */
const OPEN = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
OPEN.needsUpdate = true;

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
            // Set from the start, so a gobo coming or going never rebuilds the shaders
            light.map = light.castShadow ? OPEN : null;
            light.shadow.mapSize.set(1024, 1024);
            light.shadow.bias = -0.0005;
            light.shadow.camera.near = 0.2;
            this.root.add(light, light.target);
            return light;
        });
    }

    set(spots: readonly Spot[]): void {
        const strength = (spot: Spot): number => spot.level * spot.lumens;
        // Lights with a gobo first: only the first lights can project it
        const brightest = [...spots].filter((spot) => spot.level > 0).sort((a, b) => Number(b.gobo !== undefined) - Number(a.gobo !== undefined) || strength(b) - strength(a));
        this.pool.forEach((light, index) => {
            const spot = brightest[index];
            if (spot === undefined) {
                light.intensity = 0;
                return;
            }
            if (light.map !== null) {
                light.map = spot.gobo ?? OPEN;
            }
            light.position.copy(spot.position);
            light.target.position.copy(spot.position).add(spot.direction);
            light.color.copy(spot.color);
            // The edge of a pattern is its own: the light does not fade it
            light.penumbra = spot.gobo !== undefined ? 0 : 0.2 + 0.8 * (spot.soft ?? 0.35);
            light.angle = THREE.MathUtils.degToRad(Math.max(4, Math.min(spot.cone ?? spot.angle, 120)) / 2);
            // A narrow beam concentrates the same light
            const focus = Math.min(4, Math.sqrt(25 / Math.max(3, spot.angle)));
            light.intensity = spot.level * focus * Math.sqrt(spot.lumens / 3000) * 45;
        });
    }
}
