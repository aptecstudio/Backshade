/**
 * 3D view of the stage: floor with its grid (squares of 20 cm, stronger
 * lines every meter), lights, camera with the front, top, side and free
 * views, orbit with mouse and touch. It draws only when something changes.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Component, create } from '../../framework/ts/index.js';
import { STAGE_GRID } from '../../shared/stage/stage.js';

/** Camera view */
export type StageCamera = 'front' | 'top' | 'side' | 'free';
export const STAGE_CAMERAS: readonly StageCamera[] = ['front', 'top', 'side', 'free'];

/** Side of the floor grid, in meters */
const FLOOR = 20;

// Direction from the centre towards the camera of each view
const DIRECTIONS: Readonly<Record<StageCamera, [number, number, number]>> = {
    front: [0, 0.12, 1],
    top: [0, 1, 0.001],
    side: [1, 0.12, 0],
    free: [0.45, 0.5, 1]
};

export class StageView extends Component<HTMLDivElement> {
    readonly scene = new THREE.Scene();
    readonly camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400);
    readonly orbit: OrbitControls;
    private readonly renderer: THREE.WebGLRenderer;
    private frame = 0;

    constructor() {
        super(create('div', { classes: ['stage-view'] }));
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.element.append(this.renderer.domElement);

        this.scene.background = new THREE.Color(0x16171a);
        const sun = new THREE.DirectionalLight(0xffffff, 2);
        sun.position.set(4, 8, 6);
        // A second, weaker light from behind separates the shapes from the background
        const back = new THREE.DirectionalLight(0xffffff, 0.8);
        back.position.set(-6, 4, -5);
        const squares = new THREE.GridHelper(FLOOR, Math.round(FLOOR / STAGE_GRID), 0x24252a, 0x24252a);
        const meters = new THREE.GridHelper(FLOOR, FLOOR, 0x5a5d66, 0x3a3c43);
        meters.position.y = 0.001;
        this.scene.add(new THREE.HemisphereLight(0xdfe3ea, 0x1b1c20, 1.8), sun, back, squares, meters);

        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.addEventListener('change', () => this.draw());

        const observer = new ResizeObserver(() => this.resize());
        observer.observe(this.element);
        this.track(() => {
            observer.disconnect();
            cancelAnimationFrame(this.frame);
            this.orbit.dispose();
            this.renderer.dispose();
        });
    }

    /** Surface that receives mouse and touch */
    get surface(): HTMLCanvasElement {
        return this.renderer.domElement;
    }

    /** Point the camera looks at, on the floor */
    get centre(): { x: number; z: number } {
        return this.orbit.target;
    }

    /** Moves the camera to a view of the whole content */
    setCamera(view: StageCamera, content: THREE.Object3D): void {
        const box = new THREE.Box3().setFromObject(content);
        const centre = box.isEmpty() ? new THREE.Vector3(0, 1, 0) : box.getCenter(new THREE.Vector3());
        const radius = box.isEmpty() ? 4 : Math.max(2, box.getSize(new THREE.Vector3()).length() / 2);
        const distance = radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov) / 2);
        this.camera.position.copy(centre).add(new THREE.Vector3(...DIRECTIONS[view]).normalize().multiplyScalar(distance));
        this.orbit.target.copy(centre);
        this.orbit.update();
        this.draw();
    }

    draw(): void {
        if (this.frame === 0) {
            this.frame = requestAnimationFrame(() => {
                this.frame = 0;
                this.renderer.render(this.scene, this.camera);
            });
        }
    }

    private resize(): void {
        const { clientWidth: width, clientHeight: height } = this.element;
        if (width === 0 || height === 0) {
            return;
        }
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.draw();
    }
}
