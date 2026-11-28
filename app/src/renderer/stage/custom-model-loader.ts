/**
 * Drawing of an imported model: the colors of its material file (textures
 * are not used), its measures turned into meters with Y up, standing on the
 * floor with the middle of its footprint at the origin.
 */

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { UNIT_METERS, type CustomModel } from '../../shared/stage/custom-model.js';
import { engine } from '../transport/engine.js';
import { stageMaterial } from './stage-materials.js';

/** Colors and opacities of the materials of a .mtl file, by name */
function materialsOf(text: string): Map<string, THREE.MeshStandardMaterial> {
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    let current: THREE.MeshStandardMaterial | null = null;
    for (const line of text.split('\n')) {
        const [keyword, ...rest] = line.trim().split(/\s+/);
        const values = rest.map(Number);
        if (keyword === 'newmtl') {
            current = new THREE.MeshStandardMaterial({ color: 0x8a8d94, roughness: 0.75, side: THREE.DoubleSide });
            materials.set(rest.join(' '), current);
        } else if (current !== null && keyword === 'Kd' && values.slice(0, 3).every(Number.isFinite)) {
            current.color.setRGB(values[0], values[1], values[2], THREE.SRGBColorSpace);
        } else if (current !== null && (keyword === 'd' || keyword === 'Tr') && Number.isFinite(values[0])) {
            const opacity = keyword === 'd' ? values[0] : 1 - values[0];
            current.opacity = Math.max(0.1, Math.min(1, opacity));
            current.transparent = current.opacity < 1;
        }
    }
    return materials;
}

export async function loadCustomModel(model: CustomModel): Promise<THREE.Group> {
    const files = await engine().request('stage.readModel', { id: model.id });
    const materials = files.mtl === null ? new Map<string, THREE.MeshStandardMaterial>() : materialsOf(files.mtl);
    const content = new OBJLoader().parse(files.obj);
    content.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            const styled = [object.material].flat().map((material: THREE.Material) => materials.get(material.name) ?? stageMaterial('neutral'));
            object.material = Array.isArray(object.material) ? styled : styled[0];
            if (object.geometry.getAttribute('normal') === undefined) {
                object.geometry.computeVertexNormals();
            }
        } else if (object instanceof THREE.Line || object instanceof THREE.Points) {
            // Only surfaces are shown
            object.visible = false;
        }
    });
    content.scale.setScalar(UNIT_METERS[model.unit]);
    if (model.up === 'z') {
        content.rotation.x = -Math.PI / 2;
    }
    content.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(content);
    const centre = box.getCenter(new THREE.Vector3());
    content.position.set(-centre.x, -box.min.y, -centre.z);
    return new THREE.Group().add(content);
}
