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
import type { RequestContext, RequestRouter } from '../transport/request-router';
import { chooseFile, chooseSaveFile } from '../window/file-dialogs';

/**
 * Removes the path on disk, which the interface must not know.
 */
function toInfo({ id, name, description, source }: TemplateRecord): TemplateInfo {
    return { id, name, description, source };
}

function requireDesktop(context: RequestContext): void {
    if (context.transport !== 'ipc') {
        throw new EngineError('desktop-only', 'Available only in the desktop application');
    }
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
            throw new EngineError('no-show', 'Nessuno show aperto');
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

    router.register('template.export', async (params, context) => {
        requireDesktop(context);
        const record = findTemplate(requireString(requireObject(params), 'id'));
        const target = await chooseSaveFile(
            [{ name: 'Backshade template', extensions: [ARCHIVE_EXTENSIONS.template] }],
            `${plainName(record)}.${ARCHIVE_EXTENSIONS.template}`
        );
        if (target === null) {
            return null;
        }
        await packFolder(record.folder, target, 'template', plainName(record), TRANSIENT_ENTRIES);
        return target;
    });

    router.register('template.import', async (_params, context) => {
        requireDesktop(context);
        const archive = await chooseFile([{ name: 'Backshade template', extensions: [ARCHIVE_EXTENSIONS.template] }]);
        if (archive === null) {
            return null;
        }
        const folder = await unpackArchive(archive, USER_TEMPLATES_DIR, 'template');
        const record = readTemplateFolder('user', folder);
        changed();
        return toInfo(record);
    });
}
