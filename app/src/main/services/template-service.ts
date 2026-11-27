/**
 * template.* methods: list, saving the open show as a template,
 * editing and deleting user templates.
 */

import type { TemplateInfo } from '../../shared/transport/engine-api';
import { ARCHIVE_EXTENSIONS, packFolder, unpackArchive } from '../archive/backshade-archive';
import { USER_TEMPLATES_DIR } from '../paths';
import { TRANSIENT_ENTRIES } from '../shows/show-files';
import type { ShowSession } from '../shows/show-session';
import {
    createTemplateFromShow,
    deleteTemplate,
    findTemplate,
    listTemplates,
    readTemplateFolder,
    updateTemplate,
    type TemplateRecord
} from '../templates/template-library';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import { pickedFile, pickedTarget } from '../files/picked-paths';

/**
 * Removes the path on disk, which the interface must not know.
 */
function toInfo({ id, name, description, source }: TemplateRecord): TemplateInfo {
    return { id, name, description, source };
}

/**
 * Template name in the reference language, for file names.
 */
function plainName(record: TemplateRecord): string {
    return typeof record.name === 'string' ? record.name : record.name.en ?? Object.values(record.name)[0] ?? 'template';
}

/**
 * Registers the methods of the service.
 */
export function registerTemplateService(router: RequestRouter, bus: EventBus, session: ShowSession): void {
    const changed = (): void => bus.emit('templates.changed', {});

    router.register('template.list', () => listTemplates().map(toInfo));

    router.register('template.saveCurrent', (params) => {
        const input = requireObject(params);
        const show = session.summary();
        if (show === null) {
            throw new EngineError('no-show', 'No show open');
        }
        if (show.dirty) {
            throw new EngineError('unsaved-changes', 'Save the show before creating a template from it');
        }
        const record = createTemplateFromShow(show.folder, requireString(input, 'name'), requireString(input, 'description'));
        changed();
        return toInfo(record);
    });

    router.register('template.update', (params) => {
        const input = requireObject(params);
        const record = updateTemplate(requireString(input, 'id'), requireString(input, 'name'), requireString(input, 'description'));
        changed();
        return toInfo(record);
    });

    router.register('template.delete', (params) => {
        deleteTemplate(requireString(requireObject(params), 'id'));
        changed();
        return undefined;
    });

    router.register('template.export', async (params) => {
        const input = requireObject(params);
        const record = findTemplate(requireString(input, 'id'));
        const target = pickedTarget(requireString(input, 'file'), ARCHIVE_EXTENSIONS.template, session);
        await packFolder(record.folder, target, 'template', plainName(record), TRANSIENT_ENTRIES);
        return target;
    });

    router.register('template.import', async (params) => {
        const archive = pickedFile(requireString(requireObject(params), 'file'), session);
        const folder = await unpackArchive(archive, USER_TEMPLATES_DIR, 'template');
        const record = readTemplateFolder('user', folder);
        changed();
        return toInfo(record);
    });
}
