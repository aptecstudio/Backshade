/**
 * Look of the materials of the stage models, by the names the .obj files
 * use (usemtl). Unknown names, as in imported models, get a neutral look.
 */

import * as THREE from 'three';

const LOOKS: Readonly<Record<string, THREE.MeshStandardMaterialParameters>> = {
    aluminium: { color: 0xaeb3ba, metalness: 0.35, roughness: 0.45 },
    body: { color: 0x555a63, metalness: 0.2, roughness: 0.55 },
    panel: { color: 0x747d8b, metalness: 0.3, roughness: 0.5 },
    lens: { color: 0x9fb4d6, metalness: 0.1, roughness: 0.15, emissive: 0x1d2a3d },
    floor: { color: 0x5c5347, roughness: 0.9 },
    cloth: { color: 0x34363b, roughness: 1 },
    // People: skin, hair and clothes in greys, told apart by their lightness
    figure: { color: 0xb9b4ae, roughness: 0.75 },
    lips: { color: 0x8f7774, roughness: 0.6 },
    dark: { color: 0x26272b, roughness: 0.5 },
    hair: { color: 0x3d3835, roughness: 0.65 },
    clothes: { color: 0x59616e, roughness: 0.9 },
    dress: { color: 0x6c5f6b, roughness: 0.9 },
    trousers: { color: 0x41464f, roughness: 0.9 },
    shoes: { color: 0x232427, roughness: 0.6 },
    neutral: { color: 0x6b6e75, roughness: 0.8 }
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

export function stageMaterial(name: string): THREE.MeshStandardMaterial {
    const key = name in LOOKS ? name : 'neutral';
    let material = cache.get(key);
    if (material === undefined) {
        // Both sides: models made elsewhere may list their faces either way
        material = new THREE.MeshStandardMaterial({ ...LOOKS[key], side: THREE.DoubleSide });
        cache.set(key, material);
    }
    return material;
}
