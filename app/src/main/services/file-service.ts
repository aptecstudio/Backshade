/**
 * fs.* methods: the internal file manager, which replaces the system file
 * dialogs. Every path is checked against the roots; changes in the media of
 * the open show are notified with media.changed.
 */

import path from 'node:path';
import { allowedPath, fileRoots, isInside } from '../files/file-roots';
import { listFolder } from '../files/file-listing';
import { copyEntries, createFolder, deleteEntries, moveEntries, renameEntry, requireChangeable, requireWritable, trashEntries } from '../files/file-operations';
import type { ShowSession } from '../shows/show-session';
import type { EventBus } from '../transport/event-bus';
import { requireObject, requireString, requireStringArray } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Registers the methods of the service.
 */
export function registerFileService(router: RequestRouter, bus: EventBus, session: ShowSession): void {
    const showFolder = (): string | null => session.summary()?.folder ?? null;
    const allowed = (target: string): string => allowedPath(target, showFolder());
    // A change in the media of the open show reaches the sections that list them
    const changed = (...paths: string[]): void => {
        const folder = showFolder();
        if (folder !== null && paths.some((item) => isInside(item, path.join(folder, 'media')))) {
            bus.emit('media.changed', {});
        }
    };
    const sourcesOf = (input: Record<string, unknown>): string[] => requireStringArray(input, 'paths').map(allowed);
    const changeable = (input: Record<string, unknown>): string[] => {
        const paths = sourcesOf(input);
        paths.forEach((item) => requireChangeable(item, showFolder()));
        return paths;
    };
    const writableFolder = (target: string): string => {
        const folder = allowed(target);
        requireWritable(folder, showFolder());
        return folder;
    };

    router.register('fs.roots', () => fileRoots(showFolder()));

    router.register('fs.list', (params) => listFolder(allowed(requireString(requireObject(params), 'path')), fileRoots(showFolder())));

    router.register('fs.createFolder', (params) => {
        const input = requireObject(params);
        const parent = writableFolder(requireString(input, 'parent'));
        const created = createFolder(parent, requireString(input, 'name'));
        changed(created);
        return created;
    });

    router.register('fs.rename', (params) => {
        const input = requireObject(params);
        const target = allowed(requireString(input, 'path'));
        requireChangeable(target, showFolder());
        const renamed = renameEntry(target, requireString(input, 'name'));
        changed(target, renamed);
        return renamed;
    });

    router.register('fs.copy', async (params) => {
        const input = requireObject(params);
        const paths = sourcesOf(input);
        const target = writableFolder(requireString(input, 'target'));
        await copyEntries(paths, target);
        changed(target);
        return undefined;
    });

    router.register('fs.move', async (params) => {
        const input = requireObject(params);
        const paths = changeable(input);
        const target = writableFolder(requireString(input, 'target'));
        await moveEntries(paths, target);
        changed(target, ...paths);
        return undefined;
    });

    router.register('fs.trash', async (params) => {
        const paths = changeable(requireObject(params));
        await trashEntries(paths);
        changed(...paths);
        return undefined;
    });

    router.register('fs.delete', async (params) => {
        const paths = changeable(requireObject(params));
        await deleteEntries(paths);
        changed(...paths);
        return undefined;
    });
}
