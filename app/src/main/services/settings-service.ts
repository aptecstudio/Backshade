/**
 * Metodi settings.*: lettura e modifica delle impostazioni globali.
 */

import path from 'node:path';
import type { AppSettings } from '../../shared/transport/engine-api';
import { readSettings, updateSettings } from '../settings/app-settings';
import { optionalString, requireObject } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Registra i metodi del servizio.
 */
export function registerSettingsService(router: RequestRouter): void {
    router.register('settings.get', () => readSettings());

    router.register('settings.update', (params) => {
        const input = requireObject(params);
        const changes: Partial<AppSettings> = {};
        const folder = optionalString(input, 'defaultShowsFolder');
        if (folder !== undefined && folder.trim() !== '') {
            changes.defaultShowsFolder = path.resolve(folder);
        }
        return updateSettings(changes);
    });
}
