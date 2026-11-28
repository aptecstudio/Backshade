/**
 * Default gobo masks, drawn on request after the gobos chosen for Backshade
 * (their photo given by the human): white is the lit part.
 */

import { MASK_SIZE } from './gobo-mask.js';

export const GOBO_PRESETS = ['circle', 'dotRing', 'swirl', 'wave', 'flower', 'cross'] as const;
export type GoboPreset = typeof GOBO_PRESETS[number];

const R = MASK_SIZE / 2 - 2;
const SHAPE_SIZE = 0.84;

function disc(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
}

/** Repeats a drawing around the centre */
function around(context: CanvasRenderingContext2D, times: number, draw: () => void): void {
    for (let index = 0; index < times; index++) {
        draw();
        context.rotate((Math.PI * 2) / times);
    }
}

/** Point at a distance from the centre, in parts of the radius, and degrees clockwise from the top */
function polar(distance: number, degrees: number): [number, number] {
    const angle = (degrees * Math.PI) / 180;
    return [Math.sin(angle) * distance * R, -Math.cos(angle) * distance * R];
}

/** Arms of the cross, as measured on the gobo: it leans */
const CROSS_ARMS: ReadonlyArray<[number, number]> = [[-0.2, -0.95], [0.93, -0.4], [0.33, 0.87], [-0.76, 0.3]];

const SHAPES: Readonly<Record<GoboPreset, (context: CanvasRenderingContext2D) => void>> = {
    circle: (context) => disc(context, 0, 0, R),
    dotRing: (context) => around(context, 8, () => disc(context, 0, -R * 0.75, R * 0.235)),
    swirl: (context) => around(context, 6, () => {
        context.lineWidth = R * 0.23;
        context.beginPath();
        context.moveTo(...polar(0.38, -52));
        context.quadraticCurveTo(...polar(0.9, -40), ...polar(0.88, 2));
        context.stroke();
    }),
    wave: (context) => {
        context.lineWidth = R * 0.3;
        context.beginPath();
        context.moveTo(-0.4 * R, -0.82 * R);
        context.bezierCurveTo(-0.3 * R, -0.66 * R, -0.82 * R, -0.24 * R, -0.04 * R, 0.04 * R);
        context.bezierCurveTo(0.76 * R, 0.33 * R, 0.52 * R, 0.52 * R, 0.37 * R, 0.83 * R);
        context.stroke();
    },
    flower: (context) => {
        context.rotate(-Math.PI / 18);
        around(context, 8, () => {
            context.lineWidth = R * 0.21;
            context.beginPath();
            context.moveTo(0, -R * 0.43);
            context.lineTo(0, -R * 0.87);
            context.stroke();
        });
    },
    cross: (context) => {
        for (const [x, y] of CROSS_ARMS) {
            const length = Math.hypot(x, y);
            const [sideX, sideY] = [-y / length, x / length];
            // Each arm narrows from the centre to its round tip
            context.beginPath();
            context.moveTo(sideX * R * 0.17, sideY * R * 0.17);
            context.lineTo(x * R * 0.9 + sideX * R * 0.09, y * R * 0.9 + sideY * R * 0.09);
            context.lineTo(x * R * 0.9 - sideX * R * 0.09, y * R * 0.9 - sideY * R * 0.09);
            context.lineTo(-sideX * R * 0.17, -sideY * R * 0.17);
            context.fill();
            disc(context, x * R * 0.9, y * R * 0.9, R * 0.09);
        }
    }
};

export function presetMask(preset: GoboPreset): string {
    const canvas = document.createElement('canvas');
    canvas.width = MASK_SIZE;
    canvas.height = MASK_SIZE;
    const context = canvas.getContext('2d');
    if (context === null) {
        throw new Error('Canvas not available');
    }
    context.fillStyle = '#000';
    context.fillRect(0, 0, MASK_SIZE, MASK_SIZE);
    context.fillStyle = '#fff';
    context.strokeStyle = '#fff';
    context.lineCap = 'round';
    context.translate(MASK_SIZE / 2, MASK_SIZE / 2);
    // On the gobos only the full circle reaches the edge of the light
    if (preset !== 'circle') {
        context.scale(SHAPE_SIZE, SHAPE_SIZE);
    }
    SHAPES[preset](context);
    return canvas.toDataURL('image/png');
}
