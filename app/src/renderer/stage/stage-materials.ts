/**
 * Look of the materials of the stage models, by the names the .obj files
 * use (usemtl). Unknown names, as in imported models, get a neutral look.
 */

import * as THREE from 'three';

const LENS: THREE.MeshStandardMaterialParameters = { color: 0x9fb4d6, metalness: 0.1, roughness: 0.15, emissive: 0x1d2a3d };

const LOOKS: Readonly<Record<string, THREE.MeshStandardMaterialParameters>> = {
    aluminium: { color: 0xaeb3ba, metalness: 0.35, roughness: 0.45 },
    body: { color: 0x555a63, metalness: 0.2, roughness: 0.55 },
    panel: { color: 0x747d8b, metalness: 0.3, roughness: 0.5 },
    lens: LENS,
    // Lenses of the fixtures with several lights, each lit by itself
    ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`lens-${index + 1}`, LENS])),
    floor: { color: 0x5c5347, roughness: 0.9 },
    cloth: { color: 0x34363b, roughness: 1 },
    // People
    figure: { color: 0xb9b4ae, roughness: 0.75 },
    lips: { color: 0x8f7774, roughness: 0.6 },
    dark: { color: 0x26272b, roughness: 0.5 },
    hair: { color: 0x3d3835, roughness: 0.65 },
    trousers: { color: 0x41464f, roughness: 0.9 },
    shoes: { color: 0x232427, roughness: 0.6 },
    // Hair and clothes of the musicians, muted colors
    'hair-black': { color: 0x1d1b1c, roughness: 0.6 },
    'hair-blond': { color: 0xb59a66, roughness: 0.6 },
    'hair-red': { color: 0x8c4a2c, roughness: 0.6 },
    'hair-grey': { color: 0x9a9a98, roughness: 0.65 },
    'wear-black': { color: 0x2a2b30, roughness: 0.9 },
    'wear-white': { color: 0xc9c7c1, roughness: 0.9 },
    'wear-slate': { color: 0x59616e, roughness: 0.9 },
    'wear-red': { color: 0x8a3f3c, roughness: 0.9 },
    'wear-blue': { color: 0x3f5a86, roughness: 0.9 },
    'wear-green': { color: 0x4b6b50, roughness: 0.9 },
    'wear-teal': { color: 0x3b6b6e, roughness: 0.9 },
    'wear-ochre': { color: 0xa07c3c, roughness: 0.9 },
    'wear-purple': { color: 0x6a5078, roughness: 0.9 },
    'wear-denim': { color: 0x3c4a66, roughness: 0.95 },
    'wear-khaki': { color: 0x6f6850, roughness: 0.95 },
    // Instruments
    instrument: { color: 0x6e4a48, metalness: 0.2, roughness: 0.35 },
    wood: { color: 0x8a6e50, roughness: 0.6 },
    brass: { color: 0xb09a5c, metalness: 0.55, roughness: 0.35 },
    skin: { color: 0xd4d1c9, roughness: 0.7 },
    keys: { color: 0xdcdcd6, roughness: 0.4 },
    gloss: { color: 0x454953, metalness: 0.35, roughness: 0.22 },
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
