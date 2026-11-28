/**
 * Textures of what stands in front of the lights: the mask of the gobo,
 * turned and, out of focus, blurred, repeated as the prism does. They are
 * projected on the surfaces; the mask alone also shapes the beams in the haze.
 */

import * as THREE from 'three';
import type { PrismLayout } from '../../shared/stage/prism-layout.js';
import { maskBitmap } from '../fixtures/editor/gobo-mask.js';

/** Side of a texture, in pixels */
const SIZE = 256;

interface Gobo {
    texture: THREE.CanvasTexture;
    context: CanvasRenderingContext2D;
    /** What is drawn now */
    drawn: string;
}

export interface Pattern {
    /** Mask of the gobo, null for an open light */
    mask: string | null;
    /** Rotation of the gobo, radians */
    turn: number;
    /** Blur, 0 to 1 */
    soft: number;
    /** Copies of the prism and its rotation, radians */
    layout: PrismLayout;
    prismTurn: number;
    /** Sideways jump of a shaking gobo, as a part of the radius of a copy */
    shift?: number;
}

export class StageGobos {
    private readonly pictures = new Map<string, ImageBitmap | null>();
    private readonly gobos = new Map<string, Gobo>();

    /** Texture of a light, or null while the picture of its mask is read */
    texture(id: string, pattern: Pattern): THREE.Texture | null {
        const { mask, turn, soft, layout, prismTurn, shift = 0 } = pattern;
        let picture: ImageBitmap | null = null;
        if (mask !== null) {
            const known = this.pictures.get(mask);
            if (known === undefined) {
                this.pictures.set(mask, null);
                void maskBitmap(mask).then((bitmap) => this.pictures.set(mask, bitmap), () => undefined);
            }
            if (!known) {
                return null;
            }
            picture = known;
        }
        let gobo = this.gobos.get(id);
        if (gobo === undefined) {
            const canvas = document.createElement('canvas');
            canvas.width = SIZE;
            canvas.height = SIZE;
            const context = canvas.getContext('2d');
            if (context === null) {
                return null;
            }
            gobo = { texture: new THREE.CanvasTexture(canvas), context, drawn: '' };
            this.gobos.set(id, gobo);
        }
        // Drawn again only when what is seen changes
        const blur = Math.round(soft * 8);
        const key = `${turn.toFixed(2)} ${blur} ${layout.copies.length} ${prismTurn.toFixed(2)} ${shift.toFixed(2)} ${mask?.length} ${mask?.slice(-24)}`;
        if (gobo.drawn !== key) {
            gobo.drawn = key;
            const { context } = gobo;
            const half = SIZE / 2;
            const radius = layout.size * half;
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.filter = 'none';
            context.fillStyle = '#000';
            context.fillRect(0, 0, SIZE, SIZE);
            context.globalCompositeOperation = 'lighter';
            context.filter = blur === 0 ? 'none' : `blur(${blur}px)`;
            for (const [x, y] of layout.copies) {
                const cos = Math.cos(prismTurn);
                const sin = Math.sin(prismTurn);
                context.setTransform(1, 0, 0, 1, half + (x * cos - y * sin) * half, half - (x * sin + y * cos) * half);
                context.translate(shift * radius, 0);
                context.rotate(turn);
                if (picture === null) {
                    context.fillStyle = '#fff';
                    context.beginPath();
                    context.arc(0, 0, radius, 0, Math.PI * 2);
                    context.fill();
                } else {
                    context.drawImage(picture, -radius, -radius, radius * 2, radius * 2);
                }
            }
            context.globalCompositeOperation = 'source-over';
            gobo.texture.needsUpdate = true;
        }
        return gobo.texture;
    }

    clear(): void {
        this.gobos.forEach((gobo) => gobo.texture.dispose());
        this.gobos.clear();
    }
}
