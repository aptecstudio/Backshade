/**
 * Projection of gobos and prisms on the surfaces, with no limit set by the
 * lights of the graphics library: every surface is drawn once more, adding
 * the light of all the projectors, whose pictures are tiles of one texture.
 * Objects do not stop this light.
 */

import * as THREE from 'three';

export interface Projector {
    position: THREE.Vector3;
    direction: THREE.Vector3;
    color: THREE.Color;
    /** 0 to 1 */
    level: number;
    /** Width of the whole pattern, in degrees */
    cone: number;
    /** Picture of the pattern */
    picture: THREE.Texture;
}

/** Sizes of the shader, so it is built again only when more projectors are needed */
const CAPACITIES = [4, 8, 16, 32, 64] as const;
/** Largest side of the texture with all the pictures */
const ATLAS_SIZE = 2048;

const VERTEX = `
varying vec3 worldPosition;
varying vec3 worldNormal;
void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    worldPosition = world.xyz;
    worldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = `
uniform mat4 matrices[CAPACITY];
uniform vec3 colors[CAPACITY];
uniform vec3 origins[CAPACITY];
uniform sampler2D atlas;
uniform float columns;
uniform int count;
varying vec3 worldPosition;
varying vec3 worldNormal;
void main() {
    vec3 total = vec3(0.0);
    vec3 normal = normalize(worldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    for (int index = 0; index < CAPACITY; index++) {
        if (index >= count) {
            break;
        }
        vec4 clip = matrices[index] * vec4(worldPosition, 1.0);
        if (clip.w <= 0.0) {
            continue;
        }
        vec2 at = clip.xy / clip.w * 0.5 + 0.5;
        if (at.x <= 0.0 || at.x >= 1.0 || at.y <= 0.0 || at.y >= 1.0) {
            continue;
        }
        vec3 towards = origins[index] - worldPosition;
        float distance = length(towards);
        float facing = max(dot(normal, towards / distance), 0.0);
        float column = mod(float(index), columns);
        float row = floor(float(index) / columns);
        vec2 tile = vec2((column + at.x) / columns, 1.0 - (row + 1.0 - at.y) / columns);
        total += colors[index] * texture2D(atlas, tile).r * facing / (1.0 + distance * distance * 0.02);
    }
    gl_FragColor = vec4(total, 1.0);
}
`;

function createMaterial(capacity: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        defines: { CAPACITY: capacity },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
            matrices: { value: Array.from({ length: capacity }, () => new THREE.Matrix4()) },
            colors: { value: Array.from({ length: capacity }, () => new THREE.Color()) },
            origins: { value: Array.from({ length: capacity }, () => new THREE.Vector3()) },
            atlas: { value: null },
            columns: { value: 1 },
            count: { value: 0 }
        },
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        // Drawn over the surface itself
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: THREE.DoubleSide
    });
}

export class StageProjection {
    private material = createMaterial(CAPACITIES[0]);
    private capacity: number = CAPACITIES[0];
    private readonly overlays = new Set<THREE.Mesh>();
    private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    private readonly canvas = document.createElement('canvas');
    private atlas: THREE.CanvasTexture | null = null;
    /** Pictures drawn in the atlas now */
    private drawn = '';
    /** Side of a picture in the atlas, smaller at low quality */
    private tile = 256;

    constructor(private readonly scene: THREE.Scene) {}

    setDetail(low: boolean): void {
        this.tile = low ? 128 : 256;
    }

    /** Lays the projection over every surface of the scene, once */
    attach(): void {
        const surfaces: THREE.Mesh[] = [];
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh && [object.material].flat().every((material) => material instanceof THREE.MeshStandardMaterial) && !this.overlays.has(object) && object.userData.projected !== true) {
                surfaces.push(object);
            }
        });
        for (const surface of surfaces) {
            const overlay = new THREE.Mesh(surface.geometry, this.material);
            // It is not an object of the stage: rays go through it
            overlay.raycast = () => undefined;
            overlay.visible = false;
            surface.userData.projected = true;
            surface.add(overlay);
            this.overlays.add(overlay);
        }
    }

    detach(): void {
        for (const overlay of this.overlays) {
            if (overlay.parent !== null) {
                overlay.parent.userData.projected = false;
                overlay.removeFromParent();
            }
        }
        this.overlays.clear();
        this.drawn = '';
    }

    set(projectors: readonly Projector[]): void {
        const lit = projectors.filter((projector) => projector.level > 0.01).slice(0, CAPACITIES[CAPACITIES.length - 1]);
        const needed = CAPACITIES.find((capacity) => capacity >= lit.length) ?? CAPACITIES[CAPACITIES.length - 1];
        if (needed > this.capacity) {
            this.capacity = needed;
            this.material.dispose();
            this.material = createMaterial(needed);
            this.overlays.forEach((overlay) => {
                overlay.material = this.material;
            });
        }
        for (const overlay of this.overlays) {
            overlay.visible = lit.length > 0;
        }
        if (lit.length === 0) {
            return;
        }
        const columns = Math.ceil(Math.sqrt(lit.length));
        this.draw(lit, columns);
        const uniforms = this.material.uniforms;
        uniforms.count.value = lit.length;
        uniforms.columns.value = columns;
        uniforms.atlas.value = this.atlas;
        lit.forEach((projector, index) => {
            this.camera.fov = Math.max(2, Math.min(120, projector.cone));
            this.camera.updateProjectionMatrix();
            this.camera.position.copy(projector.position);
            // Straight down or up, another direction has to be the top of the picture
            this.camera.up.set(0, 1, 0);
            if (Math.abs(projector.direction.y) > 0.99) {
                this.camera.up.set(0, 0, -1);
            }
            this.camera.lookAt(projector.position.clone().add(projector.direction));
            this.camera.updateMatrixWorld(true);
            (uniforms.matrices.value as THREE.Matrix4[])[index].multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
            (uniforms.colors.value as THREE.Color[])[index].copy(projector.color).multiplyScalar(projector.level * 0.9);
            (uniforms.origins.value as THREE.Vector3[])[index].copy(projector.position);
        });
    }

    dispose(): void {
        this.detach();
        this.atlas?.dispose();
        this.material.dispose();
    }

    /** Puts the pictures side by side, only when one of them changed */
    private draw(projectors: readonly Projector[], columns: number): void {
        const tile = Math.min(this.tile, Math.floor(ATLAS_SIZE / columns));
        const key = `${tile} ${columns} ${projectors.map((projector) => `${projector.picture.id}.${projector.picture.version}`).join(' ')}`;
        if (key === this.drawn) {
            return;
        }
        this.drawn = key;
        const side = tile * columns;
        if (this.atlas === null || this.canvas.width !== side) {
            this.canvas.width = side;
            this.canvas.height = side;
            this.atlas?.dispose();
            this.atlas = new THREE.CanvasTexture(this.canvas);
            this.atlas.generateMipmaps = false;
            this.atlas.minFilter = THREE.LinearFilter;
        }
        const context = this.canvas.getContext('2d');
        if (context === null) {
            return;
        }
        context.fillStyle = '#000';
        context.fillRect(0, 0, side, side);
        projectors.forEach((projector, index) => {
            // A black edge keeps a picture from spilling into its neighbour
            context.drawImage(projector.picture.image as HTMLCanvasElement, (index % columns) * tile + 1, Math.floor(index / columns) * tile + 1, tile - 2, tile - 2);
        });
        this.atlas.needsUpdate = true;
    }
}
