/**
 * Changes to the list of stage objects, as pure operations: placing on the
 * grid, duplicating, removing, hanging on a truss and carrying along what
 * hangs from a truss.
 */

import * as THREE from 'three';
import { STAGE_ANGLE, STAGE_GRID, STAGE_LIFT, STAGE_LIMIT, type StageObject, type StageVector } from '../../shared/stage/stage.js';
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
    return { id: crypto.randomUUID(), model, position, rotation: [0, 0, 0], fixture, hungOn: null, height: null };
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

/** Where a fixture can hang: its place in the world and the object carrying it */
interface Hook {
    carrier: StageObject;
    placement: Pick<StageObject, 'position' | 'rotation'>;
}

/** Half width of the section of a tower, and room for a fixture on its side */
const TOWER_HALF = 0.145;
const SIDE_ROOM = 0.2;

/** Horizontal bars of a model to hang under, in its own measures */
function railsOf(info: ModelInfo | undefined): Array<[THREE.Vector3, THREE.Vector3]> {
    if (info?.length !== undefined) {
        return [[new THREE.Vector3(-info.length / 2, 0, 0), new THREE.Vector3(info.length / 2, 0, 0)]];
    }
    return (info?.rails ?? []).map(([from, to]) => [new THREE.Vector3(...from), new THREE.Vector3(...to)]);
}

/** Something to hang on, or a tower */
export function canHang(info: ModelInfo | undefined): boolean {
    return info?.tower !== undefined || railsOf(info).length > 0;
}

/** Nearest places on a truss, a joint or a tower for a fixture at a point */
function hooks(target: StageObject, carrier: StageObject, models: ReadonlyMap<string, ModelInfo>): Hook[] {
    const info = models.get(carrier.model);
    const world = matrix(carrier.position, carrier.rotation);
    const local = new THREE.Vector3(...target.position).applyMatrix4(world.clone().invert());
    const bar = models.get(target.model)?.hang;
    // Under a rail: upside down, or for a bar of lights its way up with its top against the truss
    const under = railsOf(info).map(([from, to]): Hook => {
        const along = to.clone().sub(from);
        const length = along.length();
        along.normalize();
        const middle = from.clone().lerp(to, 0.5);
        const limit = Math.max(0, length / 2 - STAGE_GRID / 2);
        const offset = Math.max(-limit, Math.min(limit, Math.round(local.clone().sub(middle).dot(along) / STAGE_GRID) * STAGE_GRID));
        const point = middle.addScaledVector(along, offset);
        const yaw = Math.atan2(-along.z, along.x);
        const hung = placement(world.clone()
            .multiply(new THREE.Matrix4().makeTranslation(point.x, point.y, point.z))
            .multiply(new THREE.Matrix4().makeRotationY(yaw))
            .multiply(new THREE.Matrix4().makeRotationX(Math.PI)));
        return {
            carrier,
            placement: bar === undefined ? hung : {
                position: [hung.position[0], round(hung.position[1] - bar), hung.position[2]],
                rotation: [0, round(carrier.rotation[1] + THREE.MathUtils.radToDeg(yaw)), 0]
            }
        };
    });
    if (info?.tower === undefined) {
        return under;
    }
    // On a side of a tower: upright, facing away from it
    const height = Math.max(0.4, Math.min(info.tower - 0.4, Math.round(local.y / STAGE_GRID) * STAGE_GRID));
    const sides = [0, 90, 180, 270].map((degrees): Hook => {
        const angle = THREE.MathUtils.degToRad(degrees);
        const point = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(TOWER_HALF + SIDE_ROOM).setY(height).applyMatrix4(world);
        return { carrier, placement: { position: point.toArray().map(round) as StageVector, rotation: [0, round((carrier.rotation[1] + degrees) % 360), 0] } };
    });
    return [...under, ...sides];
}

/** Hangs an object on the nearest truss, joint or side of a tower; unchanged without any */
export function hang(objects: readonly StageObject[], id: string, models: ReadonlyMap<string, ModelInfo>): StageObject[] {
    const target = objects.find((object) => object.id === id);
    if (target === undefined) {
        return [...objects];
    }
    const from = new THREE.Vector3(...target.position);
    const distance = (hook: Hook): number => new THREE.Vector3(...hook.placement.position).distanceTo(from);
    const best = objects.filter((object) => object.id !== id).flatMap((object) => hooks(target, object, models)).sort((a, b) => distance(a) - distance(b))[0];
    if (best === undefined) {
        return [...objects];
    }
    return objects.map((object) => object.id === id ? { ...object, ...best.placement, hungOn: best.carrier.id } : object);
}

/** Height of the top an object stands on: an adjustable stand or a tower */
export function topOf(object: StageObject, models: ReadonlyMap<string, ModelInfo>): number | null {
    return liftOf(object, models) ?? models.get(object.model)?.tower ?? null;
}

/** Height of the top of an adjustable stand */
export function liftOf(object: StageObject, models: ReadonlyMap<string, ModelInfo>): number | null {
    const lift = models.get(object.model)?.lift;
    return lift === undefined ? null : Math.max(lift.min, Math.min(lift.max, object.height ?? lift.min));
}

/** Raises or lowers a stand, carrying along what is mounted on it */
export function setHeight(objects: readonly StageObject[], id: string, height: number, models: ReadonlyMap<string, ModelInfo>): StageObject[] {
    const stand = objects.find((object) => object.id === id);
    const lift = stand === undefined ? undefined : models.get(stand.model)?.lift;
    if (stand === undefined || lift === undefined) {
        return [...objects];
    }
    const next = round(Math.max(lift.min, Math.min(lift.max, Math.round(height / STAGE_LIFT) * STAGE_LIFT)));
    const delta = next - (liftOf(stand, models) ?? lift.min);
    return objects.map((object) => {
        if (object.id === id) {
            return { ...object, height: next };
        }
        return object.hungOn === id ? { ...object, position: [object.position[0], round(object.position[1] + delta), object.position[2]] as StageVector } : object;
    });
}

/** Mounts a fixture on top of the nearest stand or tower; unchanged without any */
export function mount(objects: readonly StageObject[], id: string, models: ReadonlyMap<string, ModelInfo>): StageObject[] {
    const target = objects.find((object) => object.id === id);
    if (target === undefined) {
        return [...objects];
    }
    const distance = (stand: StageObject): number => Math.hypot(stand.position[0] - target.position[0], stand.position[2] - target.position[2]);
    const stand = objects.filter((object) => object.id !== id && topOf(object, models) !== null).sort((a, b) => distance(a) - distance(b))[0];
    if (stand === undefined) {
        return [...objects];
    }
    const top = stand.position[1] + (topOf(stand, models) ?? 0) - (models.get(target.model)?.mount ?? 0);
    return objects.map((object) => object.id === id
        ? { ...object, position: [stand.position[0], round(top), stand.position[2]], rotation: [0, stand.rotation[1], 0], hungOn: stand.id }
        : object);
}

/** Takes an object off its truss or stand, standing again where it is */
export function detach(objects: readonly StageObject[], id: string): StageObject[] {
    return objects.map((object) => object.id === id ? { ...object, hungOn: null, rotation: [0, 0, 0] } : object);
}
