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
varying vec3 viewNormal;
varying vec3 viewPosition;
void main() {
    along = position.y;
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
varying float along;
varying vec3 viewNormal;
varying vec3 viewPosition;
void main() {
    float edge = pow(abs(dot(normalize(viewNormal), normalize(viewPosition))), 2.0);
    float fade = pow(1.0 - along, 1.4) + 0.08;
    gl_FragColor = vec4(color * strength * edge * fade, 1.0);
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
                uniforms: { color: { value: new THREE.Color() }, strength: { value: 0 }, startRadius: { value: 0 }, endRadius: { value: 0 }, reach: { value: 1 } },
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
        uniforms.startRadius.value = beam.lensRadius;
        uniforms.endRadius.value = beam.lensRadius + beam.length * Math.tan(THREE.MathUtils.degToRad(Math.min(beam.angle, 120) / 2));
        uniforms.reach.value = beam.length;
    }

    /** Removes the beams of the fixtures no longer there */
    keep(ids: ReadonlySet<string>): void {
        for (const [id, mesh] of this.meshes) {
            if (!ids.has(id)) {
                mesh.material.dispose();
                this.root.remove(mesh);
                this.meshes.delete(id);
            }
        }
    }
}
