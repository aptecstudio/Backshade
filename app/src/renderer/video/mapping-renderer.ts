/**
 * Draws the videomapping of an output on a canvas: every frame the pictures
 * the composition is showing (videos, images, texts and timers) are put on
 * the surfaces, in the order of the layers and with their opacity, so
 * transitions work as without mapping. The composition keeps playing them
 * out of sight.
 */

import { FULL_CROP, homography, meshPoint, type Corners, type Crop, type MappingSurface, type Mesh } from '../../shared/video/mapping.js';
import { createMappingProgram, type MappingProgram } from './mapping-shader.js';
import { testCard } from './mapping-test-card.js';

type Picture = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

/** Pieces of each side of a bent surface; a flat one is a single piece */
const PIECES = 48;

/** Two triangles for every piece of a surface: each vertex flat and bent */
function triangles(mesh: Mesh | undefined): Float32Array {
    const pieces = mesh === undefined ? 1 : PIECES;
    const data: number[] = [];
    const corner = (column: number, row: number): number[] => {
        const point: [number, number] = [column / pieces, row / pieces];
        return [...point, ...meshPoint(mesh, ...point)];
    };
    for (let row = 0; row < pieces; row++) {
        for (let column = 0; column < pieces; column++) {
            const [a, b, c, d] = [corner(column, row), corner(column + 1, row), corner(column, row + 1), corner(column + 1, row + 1)];
            data.push(...a, ...b, ...c, ...c, ...b, ...d);
        }
    }
    return new Float32Array(data);
}

export interface MappingScene {
    surfaces: MappingSurface[];
    testPattern: boolean;
    /** Name of the output */
    name: string;
}

interface Texture {
    texture: WebGLTexture;
    /** The picture does not change: it is sent to the card once */
    still: boolean;
    sent: boolean;
}

/** Size of a picture, zero while it is not ready */
function sizeOf(picture: Picture): [number, number] {
    if (picture instanceof HTMLVideoElement) {
        return picture.readyState >= 2 ? [picture.videoWidth, picture.videoHeight] : [0, 0];
    }
    return picture instanceof HTMLImageElement ? [picture.complete ? picture.naturalWidth : 0, picture.naturalHeight] : [picture.width, picture.height];
}

export class MappingRenderer {
    readonly canvas = document.createElement('canvas');
    private readonly gl: WebGL2RenderingContext;
    private readonly program: MappingProgram;
    private readonly textures = new Map<Picture, Texture>();
    private readonly cards = new Map<string, HTMLCanvasElement>();
    private scene: MappingScene = { surfaces: [], testPattern: false, name: '' };
    /** Vertices of the shapes, computed once for each mesh */
    private readonly shapes = new Map<string, Float32Array>();
    /** Vertices of the surface being drawn */
    private count = 0;
    private frame = 0;

    /**
     * @param composition - Element of the composition whose pictures are mapped
     */
    constructor(private readonly composition: HTMLElement) {
        this.canvas.classList.add('mapping-canvas');
        const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: true });
        if (gl === null) {
            throw new Error('WebGL not available');
        }
        this.gl = gl;
        this.program = createMappingProgram(gl);
    }

    setScene(scene: MappingScene): void {
        if (scene.name !== this.scene.name || scene.surfaces.length !== this.scene.surfaces.length) {
            this.cards.clear();
        }
        this.scene = scene;
    }

    start(): void {
        if (this.frame === 0) {
            const draw = (): void => {
                this.frame = requestAnimationFrame(draw);
                this.draw();
            };
            this.frame = requestAnimationFrame(draw);
        }
    }

    stop(): void {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.textures.forEach(({ texture }) => this.gl.deleteTexture(texture));
        this.textures.clear();
    }

    private draw(): void {
        const { gl, canvas, scene } = this;
        const width = Math.round(canvas.clientWidth * devicePixelRatio);
        const height = Math.round(canvas.clientHeight * devicePixelRatio);
        if (width === 0 || height === 0) {
            return;
        }
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // Without surfaces the whole output is one, as for the test image
        const surfaces: MappingSurface[] = scene.surfaces.length > 0 ? scene.surfaces
            : [{ id: '', name: '', source: 'program', corners: [[0, 0], [1, 0], [1, 1], [0, 1]], crop: FULL_CROP }];
        const seen = new Set<Picture>();
        const layers = [...this.composition.querySelectorAll(':scope > .composition__layer')];
        surfaces.forEach((surface, index) => {
            if (!this.place(surface.corners)) {
                return;
            }
            this.shape(surface.mesh);
            if (scene.testPattern) {
                const key = `${index} ${surface.name}`;
                let card = this.cards.get(key);
                if (card === undefined) {
                    card = testCard(index + 1, surface.name, scene.name);
                    this.cards.set(key, card);
                }
                seen.add(card);
                this.paint(card, FULL_CROP, [1, 1], 1, true);
                return;
            }
            const shown = surface.source === 'program' ? layers : layers.slice(surface.source, surface.source + 1);
            for (const layer of shown) {
                for (const picture of layer.querySelectorAll<Picture>('video, img, canvas')) {
                    const [pictureWidth, pictureHeight] = sizeOf(picture);
                    const opacity = Number(getComputedStyle(picture).opacity);
                    if (pictureWidth === 0 || pictureHeight === 0 || opacity <= 0.001) {
                        continue;
                    }
                    seen.add(picture);
                    this.paint(picture, surface.crop, this.fitOf(picture, pictureWidth / pictureHeight, width / height), opacity, picture instanceof HTMLImageElement);
                }
            }
        });
        for (const [picture, entry] of this.textures) {
            if (!seen.has(picture)) {
                gl.deleteTexture(entry.texture);
                this.textures.delete(picture);
            }
        }
    }

    /** Scale from composition to picture coordinates, as the fit of the layer asks */
    private fitOf(picture: Picture, pictureRatio: number, outputRatio: number): [number, number] {
        const mode = picture.dataset.fit;
        // Texts and timers are drawn at the size of the composition
        if (picture instanceof HTMLCanvasElement || mode === 'stretch') {
            return [1, 1];
        }
        const wider = pictureRatio > outputRatio;
        const cover = mode !== 'fit';
        return wider === cover ? [outputRatio / pictureRatio, 1] : [1, pictureRatio / outputRatio];
    }

    private place(corners: Corners): boolean {
        const matrix = homography(corners);
        if (matrix === null) {
            return false;
        }
        const [a, b, c, d, e, f, g, h, i] = matrix;
        // By columns, as WebGL reads it
        this.gl.uniformMatrix3fv(this.program.corners, false, [a, d, g, b, e, h, c, f, i]);
        return true;
    }

    /** Sends the vertices of a surface to the card */
    private shape(mesh: Mesh | undefined): void {
        const key = mesh === undefined ? '' : JSON.stringify(mesh);
        let data = this.shapes.get(key);
        if (data === undefined) {
            // Dragging a point makes many shapes: the old ones are not kept
            if (this.shapes.size > 64) {
                this.shapes.clear();
            }
            data = triangles(mesh);
            this.shapes.set(key, data);
        }
        this.count = data.length / 4;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.program.vertices);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW);
    }

    private paint(picture: Picture, crop: Crop, fit: [number, number], opacity: number, still: boolean): void {
        const { gl } = this;
        let entry = this.textures.get(picture);
        if (entry === undefined) {
            const texture = gl.createTexture() as WebGLTexture;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            entry = { texture, still, sent: false };
            this.textures.set(picture, entry);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        }
        if (!entry.still || !entry.sent) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
            entry.sent = true;
        }
        gl.uniform4f(this.program.crop, crop.x, crop.y, crop.width, crop.height);
        gl.uniform2f(this.program.fit, fit[0], fit[1]);
        gl.uniform1f(this.program.opacity, opacity);
        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}
