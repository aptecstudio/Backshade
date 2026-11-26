/**
 * Draws a matrix effect at a time and turns the colors into the DMX levels
 * of the matrix pixels, on every universe the matrix uses. The white
 * channel of RGBW pixels takes the common part of the three colors.
 */

import { channelsPerPixel, pixelAddresses, pixelPosition, type PatchedMatrix } from '../../shared/patch/matrix';
import type { MatrixEffect, MatrixEffectKind } from '../../shared/patch/matrix-effect';
import { drawSparkle, drawFire, drawPlasma, drawRainbow, drawWave } from './effects/animation-effects';
import { drawChase, drawGradient, drawPulse, drawScroll, drawSolid } from './effects/basic-effects';
import type { EffectDrawer, EffectFrame } from './effects/effect-tools';
import { drawImage } from './effects/image-effect';
import { drawText } from './effects/text-effect';

const DRAWERS: Readonly<Record<MatrixEffectKind, EffectDrawer>> = {
    solid: drawSolid,
    gradient: drawGradient,
    scroll: drawScroll,
    text: drawText,
    image: drawImage,
    rainbow: drawRainbow,
    wave: drawWave,
    sparkle: drawSparkle,
    fire: drawFire,
    pulse: drawPulse,
    plasma: drawPlasma,
    chase: drawChase
};

/**
 * DMX levels of a matrix showing an effect.
 * @param time - Seconds from the start of the effect
 * @returns universe -> pairs of DMX address and value
 */
export function renderMatrixEffect(matrix: PatchedMatrix, effect: MatrixEffect, time: number): Map<number, Array<[number, number]>> {
    const frame: EffectFrame = { width: matrix.width, height: matrix.height, pixels: new Float32Array(matrix.width * matrix.height * 3) };
    DRAWERS[effect.kind](effect, frame, time);

    const result = new Map<number, Array<[number, number]>>();
    const size = channelsPerPixel(matrix.pixelType);
    pixelAddresses(matrix).forEach((location, index) => {
        const { x, y } = pixelPosition(matrix, index);
        const at = (y * matrix.width + x) * 3;
        let r = frame.pixels[at];
        let g = frame.pixels[at + 1];
        let b = frame.pixels[at + 2];
        let w = 0;
        if (matrix.pixelType.includes('w')) {
            w = matrix.pixelType === 'w' ? Math.max(r, g, b) : Math.min(r, g, b);
            r -= w;
            g -= w;
            b -= w;
        }
        const levels = result.get(location.universe) ?? [];
        result.set(location.universe, levels);
        for (let channel = 0; channel < size; channel++) {
            const letter = matrix.pixelType[channel];
            const value = letter === 'r' ? r : letter === 'g' ? g : letter === 'b' ? b : w;
            levels.push([location.address + channel, Math.max(0, Math.min(255, Math.round(value)))]);
        }
    });
    return result;
}
