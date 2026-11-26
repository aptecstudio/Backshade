/**
 * matrices.* methods: the LED matrices of the open show as they are sent,
 * pixel by pixel, for the preview of the Matrices section, and their live
 * effects, part of the desk (matrices.liveChanged tells every window).
 */

import { channelsPerPixel, pixelAddresses, pixelPosition, pixelToRgb, type PatchedMatrix } from '../../shared/patch/matrix';
import { normalizeMatrixEffect } from '../../shared/patch/matrix-effect';
import type { PresetDesk } from '../console/preset-desk';
import { MatrixLive } from '../matrix/matrix-live';
import type { OutputEngine } from '../output/output-engine';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Registers the methods of the service.
 * @returns the live effects, recorded in the scenes
 */
export function registerMatrixService(router: RequestRouter, bus: EventBus, session: ShowSession, output: OutputEngine, desk: PresetDesk): MatrixLive {
    const matricesOf = (): readonly PatchedMatrix[] => session.summary() === null ? [] : session.patch().matrices;
    const live = new MatrixLive({ mixer: output.mixer, matrices: matricesOf, blind: () => desk.getState().blind });
    const announce = (): void => bus.emit('matrices.liveChanged', { effects: live.effects() });
    desk.onHome(() => {
        live.clear();
        announce();
    });
    session.onContentChange((part) => {
        if (part === 'all') {
            live.clear();
            announce();
        } else if (part === 'patch') {
            live.patchChanged();
            announce();
        }
    });

    router.register('matrices.getLive', () => live.effects());

    router.register('matrices.setLive', (params) => {
        const input = requireObject(params);
        const id = requireString(input, 'id');
        if (!matricesOf().some((matrix) => matrix.id === id)) {
            throw new EngineError('patch-fixture-not-found', `Matrix not found: ${id}`);
        }
        const effect = input.effect === null ? null : normalizeMatrixEffect(input.effect);
        if (input.effect !== null && effect === null) {
            throw new EngineError('invalid-params', 'Invalid matrix effect');
        }
        live.set(id, effect);
        announce();
        return live.effects();
    });

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

    return live;
}
