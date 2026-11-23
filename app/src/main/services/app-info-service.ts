/**
 * app.getInfo method: name, version, license and component versions.
 */

import { app } from 'electron';
import type { AppInfo } from '../../shared/transport/engine-api';
import type { RequestRouter } from '../transport/request-router';

const LICENSE = 'GPL-3.0';

/**
 * Collects the information about the application.
 */
function readAppInfo(): AppInfo {
    return {
        name: app.getName(),
        version: app.getVersion(),
        license: LICENSE,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
        platform: process.platform,
        arch: process.arch
    };
}

/**
 * Registers the methods of the service.
 */
export function registerAppInfoService(router: RequestRouter): void {
    router.register('app.getInfo', () => readAppInfo());
}
