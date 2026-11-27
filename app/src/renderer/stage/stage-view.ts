/**
 * 3D view of the stage: floor with its grid in meters, lights, camera with
 * the front, top, side and free views, orbit with mouse and touch. It draws
 * only when something changes.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Component, create } from '../../framework/ts/index.js';

/** Camera view */
export type StageCamera = 'front' | 'top' | 'side' | 'free';
export const STAGE_CAMERAS: readonly StageCamera[] = ['front', 'top', 'side', 'free'];

// Direction from the centre towards the camera of each view
const DIRECTIONS: Readonly<Record<StageCamera, [number, number, number]>> = {
    front: [0, 0.12, 1],
    top: [0, 1, 0.001],
    side: [1, 0.12, 0],
    free: [0.7, 0.55, 0.9]
};

export class StageView extends Component<HTMLDivElement> {
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400);
    private readonly controls: OrbitControls;
    private readonly content = new THREE.Group();
    private view: StageCamera = 'free';
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
        const grid = new THREE.GridHelper(20, 20, 0x4a4d54, 0x2c2d32);
        this.scene.add(new THREE.HemisphereLight(0xdfe3ea, 0x1b1c20, 1.8), sun, back, grid, this.content);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.addEventListener('change', () => this.draw());

        const observer = new ResizeObserver(() => this.resize());
        observer.observe(this.element);
        this.track(() => {
            observer.disconnect();
            cancelAnimationFrame(this.frame);
            this.controls.dispose();
            this.renderer.dispose();
        });
    }

    /** Replaces the objects of the scene and frames them */
    setContent(objects: THREE.Object3D[]): void {
        this.content.clear();
        this.content.add(...objects);
        this.setCamera(this.view);
    }

    /** Moves the camera to a view of the whole content */
    setCamera(view: StageCamera): void {
        this.view = view;
        const box = new THREE.Box3().setFromObject(this.content);
        const centre = box.isEmpty() ? new THREE.Vector3(0, 1, 0) : box.getCenter(new THREE.Vector3());
        const radius = box.isEmpty() ? 3 : Math.max(0.4, box.getSize(new THREE.Vector3()).length() / 2);
        const distance = radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov) / 2) * 1.15;
        this.camera.position.copy(centre).add(new THREE.Vector3(...DIRECTIONS[view]).normalize().multiplyScalar(distance));
        this.controls.target.copy(centre);
        this.controls.update();
        this.draw();
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

    private draw(): void {
        if (this.frame === 0) {
            this.frame = requestAnimationFrame(() => {
                this.frame = 0;
                this.renderer.render(this.scene, this.camera);
            });
        }
    }
}
