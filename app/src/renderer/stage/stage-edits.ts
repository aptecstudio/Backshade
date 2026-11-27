/**
 * Changes to the list of stage objects, as pure operations: placing on the
 * grid, duplicating, removing, hanging on a truss and carrying along what
 * hangs from a truss.
 */

import * as THREE from 'three';
import { STAGE_ANGLE, STAGE_GRID, STAGE_LIMIT, type StageObject, type StageVector } from '../../shared/stage/stage.js';
import type { ModelInfo } from './model-library.js';

const round = (value: number): number => Math.round(value * 10000) / 10000 || 0;

/** Nearest grid position */
export function snap(value: number): number {
    return round(Math.max(-STAGE_LIMIT, Math.min(STAGE_LIMIT, Math.round(value / STAGE_GRID) * STAGE_GRID)));
}

/** First free grid position starting from a point of the floor, stepping towards +X */
export function freeSpot(objects: readonly StageObject[], near: { x: number; z: number }, width: number): StageVector {
    const step = Math.max(2, Math.ceil(width / STAGE_GRID)) * STAGE_GRID;
    const z = snap(near.z);
    let x = snap(near.x);
    while (x < STAGE_LIMIT && objects.some((object) => Math.abs(object.position[0] - x) < step / 2 && Math.abs(object.position[2] - z) < 0.1 && object.position[1] === 0)) {
        x = round(x + step);
    }
    return [x, 0, z];
}

export function newObject(model: string, position: StageVector, fixture: string | null = null): StageObject {
    return { id: crypto.randomUUID(), model, position, rotation: [0, 0, 0], fixture, hungOn: null };
}

/** Removes an object; what hung from it stays where it is */
export function remove(objects: readonly StageObject[], id: string): StageObject[] {
    return objects.filter((object) => object.id !== id).map((object) => object.hungOn === id ? { ...object, hungOn: null } : object);
}

function matrix(position: StageVector, rotation: StageVector): THREE.Matrix4 {
    const euler = new THREE.Euler(...rotation.map(THREE.MathUtils.degToRad) as StageVector);
    return new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(euler), new THREE.Vector3(1, 1, 1));
}

function placement(value: THREE.Matrix4): Pick<StageObject, 'position' | 'rotation'> {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    value.decompose(position, quaternion, new THREE.Vector3());
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return {
        position: position.toArray().map(round) as StageVector,
        rotation: [euler.x, euler.y, euler.z].map((angle) => round(THREE.MathUtils.radToDeg(angle))) as StageVector
    };
}

/** Moves or turns an object, carrying along what hangs from it */
export function transform(objects: readonly StageObject[], id: string, position: StageVector, rotation: StageVector): StageObject[] {
    const target = objects.find((object) => object.id === id);
    if (target === undefined) {
        return [...objects];
    }
    const delta = matrix(position, rotation).multiply(matrix(target.position, target.rotation).invert());
    return objects.map((object) => {
        if (object.id === id) {
            return { ...object, position: position.map(round) as StageVector, rotation: rotation.map(round) as StageVector };
        }
        return object.hungOn === id ? { ...object, ...placement(delta.clone().multiply(matrix(object.position, object.rotation))) } : object;
    });
}

/** Rounds a rotation to the step of the handles */
export function snapRotation(rotation: StageVector): StageVector {
    return rotation.map((angle) => round(Math.round(angle / STAGE_ANGLE) * STAGE_ANGLE)) as StageVector;
}

/** Hangs an object upside down under the nearest truss; unchanged without trusses */
export function hang(objects: readonly StageObject[], id: string, models: ReadonlyMap<string, ModelInfo>): StageObject[] {
    const target = objects.find((object) => object.id === id);
    if (target === undefined) {
        return [...objects];
    }
    const from = new THREE.Vector3(...target.position);
    let best: { truss: StageObject; point: THREE.Matrix4; distance: number } | null = null;
    for (const truss of objects) {
        const length = models.get(truss.model)?.length;
        if (length === undefined || truss.id === id) {
            continue;
        }
        const world = matrix(truss.position, truss.rotation);
        // Position along the truss, on the grid and within its ends
        const local = from.clone().applyMatrix4(world.clone().invert());
        const along = Math.max(-length / 2 + STAGE_GRID / 2, Math.min(length / 2 - STAGE_GRID / 2, Math.round(local.x / STAGE_GRID) * STAGE_GRID));
        const point = world.clone().multiply(new THREE.Matrix4().makeTranslation(along, 0, 0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI));
        const distance = new THREE.Vector3().setFromMatrixPosition(point).distanceTo(from);
        if (best === null || distance < best.distance) {
            best = { truss, point, distance };
        }
    }
    if (best === null) {
        return [...objects];
    }
    const { truss, point } = best;
    return objects.map((object) => object.id === id ? { ...object, ...placement(point), hungOn: truss.id } : object);
}

/** Takes an object off its truss, standing again where it is */
export function detach(objects: readonly StageObject[], id: string): StageObject[] {
    return objects.map((object) => object.id === id ? { ...object, hungOn: null, rotation: [0, 0, 0] } : object);
}
