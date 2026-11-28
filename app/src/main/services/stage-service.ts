/**
 * stage.* methods: the layout of the 3D stage of the open show and its
 * window. The editor sends the whole stage, which is checked and saved as an
 * unsaved change; stage.changed tells every window. A fixture removed from
 * the patch leaves the stage. Models can be imported into the show; removing
 * one takes its objects off the stage, its files stay until the show is
 * saved elsewhere, so that closing without saving loses nothing. An imported
 * model can also go into the personal library, for all the shows; using one
 * from there copies it into the show.
 */

import { MAX_CUSTOM_MODELS, MODEL_AXES, MODEL_UNITS, type CustomModel, type ModelAxis, type ModelUnit } from '../../shared/stage/custom-model';
import { normalizeStage } from '../../shared/stage/stage';
import { pickedFile } from '../files/picked-paths';
import type { ShowSession } from '../shows/show-session';
import { inspectModel, readModel, storeModel } from '../stage/custom-model-files';
import { copyFromLibrary, listLibraryModels, removeFromLibrary, saveToLibrary, updateInLibrary } from '../stage/model-library-files';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import { requireDesktop } from '../transport/require-desktop';
import { openStage } from '../window/stage-window';

/**
 * Registers the methods of the service.
 */
export function registerStageService(router: RequestRouter, bus: EventBus, session: ShowSession): void {
    session.onContentChange((part) => {
        if (part === 'patch' && session.summary() !== null) {
            const patched = new Set(session.patch().fixtures.map((fixture) => fixture.id));
            const objects = session.stage().objects.filter((object) => object.fixture === null || patched.has(object.fixture));
            session.setStage(normalizeStage({ objects, models: session.stage().models }));
        }
        if (part === 'stage' || part === 'all') {
            bus.emit('stage.changed', {});
        }
    });

    router.register('stage.get', () => session.stage());

    router.register('stage.set', (params) => {
        // The editor changes the objects; the imported models have their own methods
        const sent = requireObject(requireObject(params).stage);
        session.setStage(normalizeStage({ objects: sent.objects, models: session.stage().models }));
        return session.stage();
    });

    const folder = (): string => session.snapshot().folder;

    const details = (input: Record<string, unknown>): Pick<CustomModel, 'name' | 'unit' | 'up'> => {
        const name = requireString(input, 'name').trim();
        const unit = requireString(input, 'unit') as ModelUnit;
        const up = requireString(input, 'up') as ModelAxis;
        if (name === '' || !MODEL_UNITS.includes(unit) || !MODEL_AXES.includes(up)) {
            throw new EngineError('invalid-params', 'Invalid name, unit or axis');
        }
        return { name: name.slice(0, 100), unit, up };
    };

    const knownModel = (id: string): CustomModel => {
        const model = session.stage().models.find((item) => item.id === id);
        if (model === undefined) {
            throw new EngineError('invalid-params', 'Unknown model');
        }
        return model;
    };

    const setModels = (models: CustomModel[], objects = session.stage().objects): void => {
        session.setStage(normalizeStage({ objects, models }));
    };

    router.register('stage.inspectModel', (params) => {
        const { size, name, materials } = inspectModel(pickedFile(requireString(requireObject(params), 'file'), session));
        return { size, name, materials: materials !== null };
    });

    router.register('stage.importModel', (params) => {
        const input = requireObject(params);
        const file = pickedFile(requireString(input, 'file'), session);
        const chosen = details(input);
        const { size, materials } = inspectModel(file);
        const { models } = session.stage();
        if (models.length >= MAX_CUSTOM_MODELS) {
            throw new EngineError('invalid-params', 'Too many models');
        }
        const model: CustomModel = { id: storeModel(folder(), file, materials), ...chosen, size };
        setModels([...models, model]);
        if (input.library === true) {
            saveToLibrary(folder(), model);
        }
        return model;
    });

    router.register('stage.updateModel', (params) => {
        const input = requireObject(params);
        const id = requireString(input, 'id');
        const chosen = details(input);
        const there = session.stage().models.find((item) => item.id === id);
        if (there === undefined) {
            // A model only in the library is changed there
            const kept = listLibraryModels().find((item) => item.id === id);
            if (kept === undefined) {
                throw new EngineError('invalid-params', 'Unknown model');
            }
            updateInLibrary({ ...kept, ...chosen });
            bus.emit('stage.changed', {});
            return undefined;
        }
        const model = { ...there, ...chosen };
        setModels(session.stage().models.map((item) => item.id === id ? model : item));
        if (input.library === true) {
            saveToLibrary(folder(), model);
            bus.emit('stage.changed', {});
        }
        return undefined;
    });

    router.register('stage.listLibraryModels', () => listLibraryModels());

    router.register('stage.useLibraryModel', (params) => {
        const id = requireString(requireObject(params), 'id');
        const { models } = session.stage();
        if (!models.some((item) => item.id === id)) {
            setModels([...models, copyFromLibrary(folder(), id)]);
        }
        return undefined;
    });

    router.register('stage.removeLibraryModel', (params) => {
        removeFromLibrary(requireString(requireObject(params), 'id'));
        bus.emit('stage.changed', {});
        return undefined;
    });

    router.register('stage.removeModel', (params) => {
        const model = knownModel(requireString(requireObject(params), 'id'));
        const { models, objects } = session.stage();
        setModels(models.filter((item) => item.id !== model.id), objects.filter((object) => object.model !== model.id));
        return undefined;
    });

    router.register('stage.readModel', (params) => readModel(folder(), knownModel(requireString(requireObject(params), 'id')).id));

    // The window acts on this computer only
    router.register('stage.open', (_params, context) => {
        requireDesktop(context);
        openStage();
        return undefined;
    });
}
