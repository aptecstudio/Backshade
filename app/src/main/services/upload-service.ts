/**
 * upload.* methods: tickets for the files sent by remote clients, into the
 * media of the open show or into a folder of the file manager. The file
 * itself arrives through the web server.
 */

import path from 'node:path';
import { mediaKindOf } from '../../shared/show/media-kinds';
import { allowedPath, isInside } from '../files/file-roots';
import { requireWritable } from '../files/file-operations';
import { Uploads } from '../remote/uploads';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireInteger, requireObject, requireString } from '../transport/params';
import type { RequestContext, RequestRouter } from '../transport/request-router';

// Besides media: show and template archives, and fixture definitions
const OTHER_EXTENSIONS = ['.bshow', '.btemplate', '.json'];

/** Only a remote client sends files: the computer itself imports them */
function requireRemote(context: RequestContext): void {
    if (context.transport !== 'remote') {
        throw new EngineError('remote-only', 'Available only to remote clients');
    }
}

/**
 * Registers the methods of the service.
 */
export function registerUploadService(router: RequestRouter, bus: EventBus, session: ShowSession): Uploads {
    const showFolder = (): string | null => session.summary()?.folder ?? null;
    const uploads = new Uploads((file) => {
        const folder = showFolder();
        if (folder !== null && isInside(file, path.join(folder, 'media'))) {
            bus.emit('media.changed', {});
        }
    });

    router.register('upload.media', (params, context) => {
        requireRemote(context);
        const input = requireObject(params);
        return uploads.begin(path.join(session.folder(), 'media'), requireString(input, 'name'), requireInteger(input, 'size'),
            (name) => mediaKindOf(name) !== null);
    });

    router.register('upload.file', (params, context) => {
        requireRemote(context);
        const input = requireObject(params);
        const folder = allowedPath(requireString(input, 'folder'), showFolder());
        requireWritable(folder, showFolder());
        return uploads.begin(folder, requireString(input, 'name'), requireInteger(input, 'size'),
            (name) => mediaKindOf(name) !== null || OTHER_EXTENSIONS.includes(path.extname(name).toLowerCase()));
    });

    return uploads;
}
