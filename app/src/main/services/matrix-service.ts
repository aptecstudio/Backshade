/**
 * matrices.* methods: the LED matrices of the open show as they are sent,
 * pixel by pixel, for the preview of the Matrices section.
 */

import { channelsPerPixel, pixelAddresses, pixelPosition, pixelToRgb } from '../../shared/patch/matrix';
import type { OutputEngine } from '../output/output-engine';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import { requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Registers the methods of the service.
 */
export function registerMatrixService(router: RequestRouter, session: ShowSession, output: OutputEngine): void {
    router.register('matrices.getPixels', (params) => {
        const id = requireString(requireObject(params), 'id');
        const matrix = session.summary() === null ? undefined : session.patch().matrices.find((item) => item.id === id);
        if (matrix === undefined) {
            throw new EngineError('patch-fixture-not-found', `Matrix not found: ${id}`);
        }
        // Colors in grid order (rows from the top), three values per pixel
        const pixels = new Array<number>(matrix.width * matrix.height * 3).fill(0);
        const frames = new Map<number, Uint8Array>();
        const size = channelsPerPixel(matrix.pixelType);
        pixelAddresses(matrix).forEach((location, index) => {
            let frame = frames.get(location.universe);
            if (frame === undefined) {
                frame = output.frame(location.universe);
                frames.set(location.universe, frame);
            }
            const color = pixelToRgb(matrix.pixelType, frame.subarray(location.address - 1, location.address - 1 + size));
            const { x, y } = pixelPosition(matrix, index);
            const at = (y * matrix.width + x) * 3;
            pixels[at] = color.r;
            pixels[at + 1] = color.g;
            pixels[at + 2] = color.b;
        });
        return pixels;
    });
}
