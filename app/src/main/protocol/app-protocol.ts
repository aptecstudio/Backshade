/**
 * Internal app:// protocol serving the interface files.
 * It replaces file:// to have a stable origin, needed by
 * native ES modules and by the Content Security Policy.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { net, protocol } from 'electron';
import { WEB_ROOT } from '../paths';
import { handleLocaleRequest } from './locale-routes';
import { handleShowMediaRequest } from './show-media-route';

const SCHEME = 'app';
const HOST = 'backshade';

/**
 * Registers the scheme as privileged. To be called before app.whenReady().
 */
export function registerScheme(): void {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: SCHEME,
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                // Audio and video of the show media are streamed by the playback window
                stream: true
            }
        }
    ]);
}

/**
 * Converts a request into a path inside the interface folder.
 * Returns null if the path leaves the folder.
 */
export function resolveWebFile(pathname: string): string | null {
    const relativePath = decodeURIComponent(pathname);
    const filePath = path.normalize(path.join(WEB_ROOT, relativePath));

    if (filePath !== WEB_ROOT && !filePath.startsWith(WEB_ROOT + path.sep)) {
        return null;
    }

    return filePath;
}

/**
 * Activates the protocol handler. To be called after app.whenReady().
 */
export function handle(): void {
    protocol.handle(SCHEME, (request) => {
        const url = new URL(request.url);

        if (url.host !== HOST) {
            return new Response(null, { status: 404 });
        }

        const mediaResponse = handleShowMediaRequest(url.pathname, request);
        if (mediaResponse !== null) {
            return mediaResponse;
        }

        const localeResponse = handleLocaleRequest(url.pathname);
        if (localeResponse !== null) {
            return localeResponse;
        }

        const filePath = resolveWebFile(url.pathname);

        if (filePath === null) {
            return new Response(null, { status: 404 });
        }

        return net.fetch(pathToFileURL(filePath).toString());
    });
}

/**
 * Returns the address of an interface page.
 * @param page - Path relative to the web folder, for example 'renderer/index.html'
 */
export function pageUrl(page: string): string {
    return `${SCHEME}://${HOST}/${page}`;
}

/**
 * Tells whether an address belongs to the internal interface.
 */
export function isInternalUrl(targetUrl: string): boolean {
    try {
        const url = new URL(targetUrl);
        return url.protocol === `${SCHEME}:` && url.host === HOST;
    } catch {
        return false;
    }
}
