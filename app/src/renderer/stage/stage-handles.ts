/**
 * Selection in the 3D view and its handles: a press on an object selects it,
 * the arrows move it on the grid of 20 cm and the rings turn it in steps of
 * 15 degrees. An adjustable stand also has an arrow on its top that sets its
 * height in steps of 10 cm.
 */

import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Emitter, type Unsubscribe } from '../../framework/ts/index.js';
import { STAGE_ANGLE, STAGE_GRID, STAGE_LIFT, type StageVector } from '../../shared/stage/stage.js';
import type { StageScene } from './stage-scene.js';
import type { StageView } from './stage-view.js';

export type HandleMode = 'translate' | 'rotate';

/** Position and rotation in degrees of the object held by the handles */
export interface HandleChange {
    id: string;
    position: StageVector;
    rotation: StageVector;
}

/** Height the arrow on top of a stand is asking for */
export interface HeightChange {
    id: string;
    height: number;
}

/** A press that moves less than this many pixels selects */
const PRESS = 6;

export class StageHandles {
    private readonly gizmo: TransformControls;
    /** Arrow on the top of an adjustable stand, and the point it moves */
    private readonly lifter: TransformControls;
    private readonly grip = new THREE.Object3D();
    private heightOf: (id: string) => number | null = () => null;
    private readonly lifts = new Emitter<HeightChange>();
    private readonly lifted = new Emitter<HeightChange>();
    private readonly outline = new THREE.BoxHelper(new THREE.Object3D(), 0xf0b429);
    private selected: string | null = null;
    private editable = false;
    /** The left button selects: with a view tool it moves the camera instead */
    private selecting = true;
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
        this.lifter = new TransformControls(view.camera, view.surface);
        this.lifter.setTranslationSnap(STAGE_LIFT);
        this.lifter.setSize(0.7);
        this.lifter.showX = false;
        this.lifter.showZ = false;
        view.scene.add(this.grip, this.lifter.getHelper());
        this.lifter.addEventListener('change', () => view.draw());
        this.lifter.addEventListener('dragging-changed', (event) => {
            view.orbit.enabled = event.value !== true;
        });
        this.lifter.addEventListener('objectChange', () => this.reportHeight(this.lifts));
        this.lifter.addEventListener('mouseUp', () => this.reportHeight(this.lifted));
        this.listenToPresses();
    }

    /** Tells the handles which objects are adjustable stands, and how high they are */
    setHeights(heightOf: (id: string) => number | null): void {
        this.heightOf = heightOf;
    }

    /** While the arrow of a stand is dragged */
    onLift(listener: (change: HeightChange) => void): Unsubscribe {
        return this.lifts.subscribe(listener);
    }

    /** When the arrow of a stand is released */
    onLifted(listener: (change: HeightChange) => void): Unsubscribe {
        return this.lifted.subscribe(listener);
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
        this.refresh();
    }

    setSelecting(selecting: boolean): void {
        this.selecting = selecting;
        this.refresh();
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
        if (node !== undefined && this.editable && this.selecting) {
            this.gizmo.attach(node);
        } else {
            this.gizmo.detach();
        }
        const height = this.selected === null ? null : this.heightOf(this.selected);
        if (node !== undefined && height !== null && this.editable && this.selecting && this.gizmo.mode === 'translate') {
            // While it is dragged the grip is where the pointer put it
            if (!this.lifter.dragging) {
                this.grip.position.copy(node.position).y += height;
            }
            this.lifter.attach(this.grip);
        } else {
            this.lifter.detach();
        }
        this.view.draw();
    }

    private reportHeight(listeners: Emitter<HeightChange>): void {
        const node = this.gizmo.object;
        if (node !== undefined && this.selected !== null) {
            listeners.emit({ id: this.selected, height: this.grip.position.y - node.position.y });
        }
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
            // Where both handles are, the arrow of the height wins
            this.gizmo.enabled = this.lifter.axis === null;
            start = this.selecting && event.isPrimary && event.button === 0 && this.gizmo.axis === null && this.lifter.axis === null ? { x: event.clientX, y: event.clientY } : null;
        }, { capture: true });
        this.view.surface.addEventListener('pointerup', (event) => {
            this.gizmo.enabled = true;
            if (start === null || this.gizmo.dragging || this.lifter.dragging || Math.hypot(event.clientX - start.x, event.clientY - start.y) > PRESS) {
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
