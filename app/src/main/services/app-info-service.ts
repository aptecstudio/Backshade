/**
 * Metodo app.getInfo: nome, versione, licenza e versioni dei componenti.
 */

import { app } from 'electron';
import type { AppInfo } from '../../shared/transport/engine-api';
import type { RequestRouter } from '../transport/request-router';

const LICENSE = 'GPL-3.0';

/**
 * Raccoglie le informazioni sull'applicazione.
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
 * Registra i metodi del servizio.
 */
export function registerAppInfoService(router: RequestRouter): void {
    router.register('app.getInfo', () => readAppInfo());
}
