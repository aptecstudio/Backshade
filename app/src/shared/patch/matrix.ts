/**
 * LED matrices of the patch: grids of pixels driven directly on DMX
 * channels, for pixel controllers, LED strips and panels (decided by the
 * human). A matrix starts at a universe and address and continues on the
 * next universes as needed: a pixel is never split between two universes,
 * so every universe holds as many whole pixels as fit in its 512 channels.
 * Saved in show.json under "patch.matrices". Shared between engine and interface.
 */

import { UNIVERSE_SIZE } from '../fixtures/fixture-definition.js';

/** Color channels of a pixel, in DMX order */
export type PixelType = 'rgb' | 'rbg' | 'grb' | 'gbr' | 'brg' | 'bgr' | 'rgbw' | 'grbw' | 'w';

/** Pixel types in presentation order */
export const PIXEL_TYPES: readonly PixelType[] = ['rgb', 'rbg', 'grb', 'gbr', 'brg', 'bgr', 'rgbw', 'grbw', 'w'];

/** Corner of the first pixel */
export type StartCorner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

/** Corners in presentation order */
export const START_CORNERS: readonly StartCorner[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

/** How the pixels are wired: along the rows or along the columns */
export type PixelDirection = 'rows' | 'columns';

/** Directions in presentation order */
export const PIXEL_DIRECTIONS: readonly PixelDirection[] = ['rows', 'columns'];

/** Limits of the matrix size */
export const MATRIX_SIZE_LIMITS = { min: 1, max: 512 } as const;

/** Most pixels in one matrix */
export const MAX_MATRIX_PIXELS = 16384;

/** LED matrix placed in the patch */
export interface PatchedMatrix {
    id: string;
    /** Number, unique among fixtures and matrices */
    number: number;
    name: string;
    /** Pixels per row and per column */
    width: number;
    height: number;
    pixelType: PixelType;
    startCorner: StartCorner;
    direction: PixelDirection;
    /** Every other row (or column) is wired in the opposite direction (zigzag) */
    snake: boolean;
    /** Universe and address of the first pixel */
    universe: number;
    address: number;
}

/** Part of a matrix on one universe */
export interface MatrixSegment {
    universe: number;
    /** First address and number of channels used in the universe */
    address: number;
    channelCount: number;
    /** First pixel (in wiring order) and number of pixels of the part */
    firstPixel: number;
    pixelCount: number;
}

/**
 * Channels of one pixel.
 */
export function channelsPerPixel(type: PixelType): number {
    return type.length;
}

/**
 * Number of pixels of a matrix.
 */
export function pixelCount(matrix: Pick<PatchedMatrix, 'width' | 'height'>): number {
    return matrix.width * matrix.height;
}

/**
 * Parts of a matrix on its universes, in order. The first pixel must fit
 * in the first universe; every following universe starts at address 1.
 */
export function matrixSegments(matrix: Pick<PatchedMatrix, 'width' | 'height' | 'pixelType' | 'universe' | 'address'>): MatrixSegment[] {
    const size = channelsPerPixel(matrix.pixelType);
    const segments: MatrixSegment[] = [];
    let remaining = pixelCount(matrix);
    let universe = matrix.universe;
    let address = matrix.address;
    let firstPixel = 0;
    while (remaining > 0) {
        const room = Math.floor((UNIVERSE_SIZE - address + 1) / size);
        if (room <= 0) {
            break;
        }
        const count = Math.min(room, remaining);
        segments.push({ universe, address, channelCount: count * size, firstPixel, pixelCount: count });
        remaining -= count;
        firstPixel += count;
        universe++;
        address = 1;
    }
    return segments;
}

/**
 * Position on the grid (x from the left, y from the top) of the pixel at a
 * place in the wiring order.
 */
export function pixelPosition(matrix: Pick<PatchedMatrix, 'width' | 'height' | 'startCorner' | 'direction' | 'snake'>, index: number): { x: number; y: number } {
    const along = matrix.direction === 'rows' ? matrix.width : matrix.height;
    const line = Math.floor(index / along);
    let step = index % along;
    if (matrix.snake && line % 2 === 1) {
        step = along - 1 - step;
    }
    let x = matrix.direction === 'rows' ? step : line;
    let y = matrix.direction === 'rows' ? line : step;
    if (matrix.startCorner === 'topRight' || matrix.startCorner === 'bottomRight') {
        x = matrix.width - 1 - x;
    }
    if (matrix.startCorner === 'bottomLeft' || matrix.startCorner === 'bottomRight') {
        y = matrix.height - 1 - y;
    }
    return { x, y };
}

/**
 * Universe and address of the first channel of each pixel, in wiring order.
 */
export function pixelAddresses(matrix: PatchedMatrix): Array<{ universe: number; address: number }> {
    const size = channelsPerPixel(matrix.pixelType);
    const result: Array<{ universe: number; address: number }> = [];
    for (const segment of matrixSegments(matrix)) {
        for (let pixel = 0; pixel < segment.pixelCount; pixel++) {
            result.push({ universe: segment.universe, address: segment.address + pixel * size });
        }
    }
    return result;
}

/**
 * Tells whether the data of a matrix are complete and consistent: size,
 * number of pixels, and room for all of them from the start address.
 */
export function isValidMatrixShape(matrix: Pick<PatchedMatrix, 'width' | 'height' | 'pixelType' | 'universe' | 'address'>): boolean {
    const sizeOk = (value: number): boolean => Number.isInteger(value) && value >= MATRIX_SIZE_LIMITS.min && value <= MATRIX_SIZE_LIMITS.max;
    if (!sizeOk(matrix.width) || !sizeOk(matrix.height) || pixelCount(matrix) > MAX_MATRIX_PIXELS) {
        return false;
    }
    if (!Number.isInteger(matrix.address) || matrix.address < 1 || matrix.address + channelsPerPixel(matrix.pixelType) - 1 > UNIVERSE_SIZE) {
        return false;
    }
    return matrixSegments(matrix).reduce((count, segment) => count + segment.pixelCount, 0) === pixelCount(matrix);
}

/** Color of a pixel for the screen, 0 to 255 per component */
export interface PixelRgb {
    r: number;
    g: number;
    b: number;
}

/**
 * Color of a pixel from its DMX values, as it looks on screen: the white
 * channel adds to the three colors, a white only pixel is grey.
 * @param values - Values of the pixel channels, in DMX order
 */
export function pixelToRgb(type: PixelType, values: ArrayLike<number>): PixelRgb {
    let r = 0;
    let g = 0;
    let b = 0;
    let w = 0;
    for (let index = 0; index < type.length; index++) {
        const value = values[index] ?? 0;
        switch (type[index]) {
            case 'r': r = value; break;
            case 'g': g = value; break;
            case 'b': b = value; break;
            default: w = value;
        }
    }
    return { r: Math.min(255, r + w), g: Math.min(255, g + w), b: Math.min(255, b + w) };
}
