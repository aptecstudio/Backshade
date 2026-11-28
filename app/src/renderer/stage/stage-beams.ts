/**
 * Visible beams: soft additive cones from the lens, as light shows in haze,
 * fading with the distance and towards their edges.
 */

import * as THREE from 'three';

const VERTEX = `
uniform float startRadius;
uniform float endRadius;
uniform float reach;
varying float along;
varying vec2 disk;
varying vec3 viewNormal;
varying vec3 viewPosition;
void main() {
    along = position.y;
    disk = position.xz;
    float radius = mix(startRadius, endRadius, along);
    vec4 view = modelViewMatrix * vec4(position.x * radius, along * reach, position.z * radius, 1.0);
    viewPosition = view.xyz;
    viewNormal = normalize(normalMatrix * vec3(position.x, 0.0, position.z));
    gl_Position = projectionMatrix * view;
}
`;

const FRAGMENT = `
uniform vec3 color;
uniform float strength;
uniform float soft;
uniform sampler2D gobo;
uniform float useGobo;
varying float along;
varying vec2 disk;
varying vec3 viewNormal;
varying vec3 viewPosition;
void main() {
    // A soft beam, out of focus or frosted, has wider edges
    float edge = pow(abs(dot(normalize(viewNormal), normalize(viewPosition))), 2.0 + soft * 6.0);
    float fade = pow(1.0 - along, 1.4) + 0.08;
    float shape = 1.0;
    if (useGobo > 0.5) {
        // The lit parts of the mask become streaks along the beam
        vec2 out2 = normalize(disk);
        shape = (texture2D(gobo, 0.5 + out2 * 0.15).r + texture2D(gobo, 0.5 + out2 * 0.28).r + texture2D(gobo, 0.5 + out2 * 0.41).r) * 0.8;
    }
    gl_FragColor = vec4(color * strength * edge * fade * shape, 1.0);
}
`;

/** Cone of radius 1 and height 1 from the origin along +Y, shaped by the shader */
const CONE = new THREE.CylinderGeometry(1, 1, 1, 32, 8, true).translate(0, 0.5, 0);

export interface Beam {
    position: THREE.Vector3;
    direction: THREE.Vector3;
    color: THREE.Color;
    /** Brightness with the haze, 0 hides the beam */
    strength: number;
    /** Beam angle in degrees */
    angle: number;
    lensRadius: number;
    length: number;
    /** Softness of the edge, 0 to 1 */
    soft?: number;
    /** Gobo in front of the light */
    gobo?: THREE.Texture | null;
}

type BeamMesh = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

export class StageBeams {
    readonly root = new THREE.Group();
    private readonly meshes = new Map<string, BeamMesh>();

    set(id: string, beam: Beam): void {
        let mesh = this.meshes.get(id);
        if (mesh === undefined) {
            mesh = new THREE.Mesh(CONE, new THREE.ShaderMaterial({
                vertexShader: VERTEX,
                fragmentShader: FRAGMENT,
                uniforms: { color: { value: new THREE.Color() }, strength: { value: 0 }, soft: { value: 0 }, gobo: { value: null }, useGobo: { value: 0 }, startRadius: { value: 0 }, endRadius: { value: 0 }, reach: { value: 1 } },
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide
            }));
            // The shader moves the vertices, so the geometry cannot tell what is out of sight
            mesh.frustumCulled = false;
            this.meshes.set(id, mesh);
            this.root.add(mesh);
        }
        mesh.visible = beam.strength > 0.002;
        mesh.position.copy(beam.position);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beam.direction);
        const { uniforms } = mesh.material;
        (uniforms.color.value as THREE.Color).copy(beam.color);
        uniforms.strength.value = beam.strength;
        uniforms.soft.value = beam.soft ?? 0;
        uniforms.gobo.value = beam.gobo ?? null;
        uniforms.useGobo.value = beam.gobo === undefined || beam.gobo === null ? 0 : 1;
        uniforms.startRadius.value = beam.lensRadius;
        uniforms.endRadius.value = beam.lensRadius + beam.length * Math.tan(THREE.MathUtils.degToRad(Math.min(beam.angle, 120) / 2));
        uniforms.reach.value = beam.length;
    }

    /** Hides every beam: those of the new frame are set again */
    frame(): void {
        for (const mesh of this.meshes.values()) {
            mesh.visible = false;
        }
    }

    /** Removes the beams of the objects no longer there; beam names start with the object */
    keep(objects: ReadonlySet<string>): void {
        for (const [id, mesh] of this.meshes) {
            if (!objects.has(id.split(':')[0])) {
                mesh.material.dispose();
                this.root.remove(mesh);
                this.meshes.delete(id);
            }
        }
    }
}
