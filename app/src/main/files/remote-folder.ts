/**
 * Folder named by a request: remote clients can only use folders inside the
 * places of the file manager; the windows of the computer any folder (for
 * example a recent show elsewhere).
 */

import path from 'node:path';
import type { RequestContext } from '../transport/request-router';
import { allowedPath } from './file-roots';

/**
 * @param showFolder - Folder of the open show, null without a show
 */
export function requestedFolder(folder: string, context: RequestContext, showFolder: string | null): string {
    return context.transport === 'remote' ? allowedPath(folder, showFolder) : path.resolve(folder);
}
