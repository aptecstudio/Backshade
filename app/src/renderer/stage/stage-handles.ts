/**
 * Selection in the 3D view and its handles: a press on an object selects it,
 * the arrows move it on the grid of 20 cm and the rings turn it in steps of
 * 15 degrees.
 */

import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Emitter, type Unsubscribe } from '../../framework/ts/index.js';
import { STAGE_ANGLE, STAGE_GRID, type StageVector } from '../../shared/stage/stage.js';
import type { StageScene } from './stage-scene.js';
import type { StageView } from './stage-view.js';

export type HandleMode = 'translate' | 'rotate';

/** Position and rotation in degrees of the object held by the handles */
export interface HandleChange {
    id: string;
    position: StageVector;
    rotation: StageVector;
}

/** A press that moves less than this many pixels selects */
const PRESS = 6;

export class StageHandles {
    private readonly gizmo: TransformControls;
    private readonly outline = new THREE.BoxHelper(new THREE.Object3D(), 0xf0b429);
    private selected: string | null = null;
    private editable = false;
    private readonly selections = new Emitter<string | null>();
    private readonly moves = new Emitter<HandleChange>();
    private readonly releases = new Emitter<HandleChange>();

    constructor(private readonly view: StageView, private readonly scene: StageScene) {
        this.gizmo = new TransformControls(view.camera, view.surface);
        this.gizmo.setTranslationSnap(STAGE_GRID);
        this.gizmo.setRotationSnap(THREE.MathUtils.degToRad(STAGE_ANGLE));
        this.gizmo.setSize(0.9);
        view.scene.add(this.gizmo.getHelper(), this.outline);
        this.outline.visible = false;

        this.gizmo.addEventListener('change', () => view.draw());
        // The camera stays still while a handle is dragged
        this.gizmo.addEventListener('dragging-changed', (event) => {
            view.orbit.enabled = event.value !== true;
        });
        this.gizmo.addEventListener('objectChange', () => {
            this.outline.update();
            this.report(this.moves);
        });
        this.gizmo.addEventListener('mouseUp', () => this.report(this.releases));
        this.listenToPresses();
    }

    /** Selected stage object */
    get selection(): string | null {
        return this.selected;
    }

    onSelect(listener: (id: string | null) => void): Unsubscribe {
        return this.selections.subscribe(listener);
    }

    /** While a handle is dragged */
    onMove(listener: (change: HandleChange) => void): Unsubscribe {
        return this.moves.subscribe(listener);
    }

    /** When a handle is released */
    onRelease(listener: (change: HandleChange) => void): Unsubscribe {
        return this.releases.subscribe(listener);
    }

    select(id: string | null): void {
        const changed = id !== this.selected;
        this.selected = id;
        this.refresh();
        if (changed) {
            this.selections.emit(id);
        }
    }

    setMode(mode: HandleMode): void {
        this.gizmo.setMode(mode);
    }

    setEditable(editable: boolean): void {
        this.editable = editable;
        this.refresh();
    }

    /** Follows the selected object after the scene changed */
    refresh(): void {
        const node = this.selected === null ? undefined : this.scene.node(this.selected);
        this.outline.visible = node !== undefined;
        if (node !== undefined) {
            this.outline.setFromObject(node);
        }
        if (node !== undefined && this.editable) {
            this.gizmo.attach(node);
        } else {
            this.gizmo.detach();
        }
        this.view.draw();
    }

    private report(listeners: Emitter<HandleChange>): void {
        const node = this.gizmo.object;
        if (node !== undefined && this.selected !== null) {
            const { x, y, z } = node.rotation;
            listeners.emit({
                id: this.selected,
                position: node.position.toArray() as StageVector,
                rotation: [x, y, z].map(THREE.MathUtils.radToDeg) as StageVector
            });
        }
    }

    private listenToPresses(): void {
        let start: { x: number; y: number } | null = null;
        // Before the handles see the press: a press on a handle is not a selection
        this.view.surface.addEventListener('pointerdown', (event) => {
            start = event.isPrimary && event.button === 0 && this.gizmo.axis === null ? { x: event.clientX, y: event.clientY } : null;
        }, { capture: true });
        this.view.surface.addEventListener('pointerup', (event) => {
            if (start === null || this.gizmo.dragging || Math.hypot(event.clientX - start.x, event.clientY - start.y) > PRESS) {
                return;
            }
            const area = this.view.surface.getBoundingClientRect();
            const pointer = new THREE.Vector2((event.clientX - area.left) / area.width * 2 - 1, 1 - (event.clientY - area.top) / area.height * 2);
            const ray = new THREE.Raycaster();
            ray.setFromCamera(pointer, this.view.camera);
            this.select(this.pick(ray));
        });
    }

    /** The object under the pointer; open shapes such as trusses are also hit inside their outline */
    private pick(ray: THREE.Raycaster): string | null {
        const hit = ray.intersectObject(this.scene.root, true)[0];
        if (hit !== undefined) {
            return this.scene.idOf(hit.object);
        }
        let best: { node: THREE.Object3D; distance: number } | null = null;
        const point = new THREE.Vector3();
        for (const node of this.scene.root.children) {
            if (ray.ray.intersectBox(new THREE.Box3().setFromObject(node), point) !== null) {
                const distance = point.distanceTo(ray.ray.origin);
                if (best === null || distance < best.distance) {
                    best = { node, distance };
                }
            }
        }
        return best === null ? null : this.scene.idOf(best.node);
    }
}
