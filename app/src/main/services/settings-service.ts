/**
 * settings.* methods: reading and changing the global settings.
 */

import type { AppSettings } from '../../shared/transport/engine-api';
import { readSettings, updateSettings } from '../settings/app-settings';
import { requestedFolder } from '../files/remote-folder';
import { optionalString, requireObject } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Registers the methods of the service.
 */
export function registerSettingsService(router: RequestRouter): void {
    router.register('settings.get', () => readSettings());

    router.register('settings.update', (params, context) => {
        const input = requireObject(params);
        const changes: Partial<AppSettings> = {};
        const folder = optionalString(input, 'defaultShowsFolder');
        if (folder !== undefined && folder.trim() !== '') {
            changes.defaultShowsFolder = requestedFolder(folder, context, null);
        }
        return updateSettings(changes);
    });
}
