/**
 * Metodi template.*: elenco, salvataggio dello show aperto come modello,
 * modifica ed eliminazione dei modelli dell'utente.
 */

import type { TemplateInfo } from '../../shared/transport/engine-api';
import type { ShowSession } from '../shows/show-session';
import {
    createTemplateFromShow,
    deleteTemplate,
    listTemplates,
    updateTemplate,
    type TemplateRecord
} from '../templates/template-library';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

/**
 * Toglie il percorso su disco, che l'interfaccia non deve conoscere.
 */
function toInfo({ id, name, description, source }: TemplateRecord): TemplateInfo {
    return { id, name, description, source };
}

/**
 * Registra i metodi del servizio.
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
            throw new EngineError('unsaved-changes', 'Salvare lo show prima di crearne un modello');
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
}
