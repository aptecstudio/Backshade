/**
 * Metodi media.*: elenco, importazione, eliminazione e visualizzazione nel
 * sistema dei media dello show aperto. Ogni cambio è notificato con media.changed.
 */

import { shell } from 'electron';
import { MEDIA_EXTENSIONS } from '../../shared/show/media-kinds';
import { importMedia, listMedia, removeMedia, resolveMediaPath } from '../shows/media-library';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireObject, requireString } from '../transport/params';
import type { RequestContext, RequestRouter } from '../transport/request-router';
import { chooseFiles } from '../window/file-dialogs';

function requireDesktop(context: RequestContext): void {
    if (context.transport !== 'ipc') {
        throw new EngineError('desktop-only', 'Disponibile solo nell\'applicazione desktop');
    }
}

/**
 * Registra i metodi del servizio.
 */
export function registerMediaService(router: RequestRouter, bus: EventBus, session: ShowSession): void {
    const changed = (): void => bus.emit('media.changed', {});

    router.register('media.list', () => listMedia(session.folder()));

    router.register('media.import', async (_params, context) => {
        requireDesktop(context);
        const folder = session.folder();
        const files = await chooseFiles([{ name: 'Media', extensions: Object.values(MEDIA_EXTENSIONS).flat() }]);
        if (files.length === 0) {
            return [];
        }
        const imported = await importMedia(folder, files);
        changed();
        return imported;
    });

    router.register('media.remove', (params) => {
        removeMedia(session.folder(), requireString(requireObject(params), 'file'));
        changed();
        return undefined;
    });

    router.register('media.reveal', (params, context) => {
        requireDesktop(context);
        shell.showItemInFolder(resolveMediaPath(session.folder(), requireString(requireObject(params), 'file')));
        return undefined;
    });
}
