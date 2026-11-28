/**
 * Personal library of imported 3D models, for all the shows of this computer:
 * their files and list in the user data folder.
 */

import fs from 'node:fs';
import path from 'node:path';
import { MAX_CUSTOM_MODELS, MODELS_FOLDER, normalizeCustomModels, type CustomModel } from '../../shared/stage/custom-model';
import { USER_MODELS_DIR } from '../paths';
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-file';
import { EngineError } from '../transport/engine-error';
import { modelFiles } from './custom-model-files';

const LIST = path.join(USER_MODELS_DIR, 'models.json');

export function listLibraryModels(): CustomModel[] {
    if (!fs.existsSync(LIST)) {
        return [];
    }
    try {
        return normalizeCustomModels(readJsonFile(LIST));
    } catch (error) {
        console.warn('Model library not read', error);
        return [];
    }
}

/** Files of a library model: the library is laid out like the models folder of a show */
const libraryFiles = (id: string): string[] => modelFiles(path.dirname(USER_MODELS_DIR), id);

function copyInto(directory: string, files: readonly string[]): void {
    fs.mkdirSync(directory, { recursive: true });
    for (const file of files) {
        fs.copyFileSync(file, path.join(directory, path.basename(file)));
    }
}

/** Adds a model of a show to the library, or changes it there */
export function saveToLibrary(showFolder: string, model: CustomModel): void {
    const models = listLibraryModels();
    if (!models.some((item) => item.id === model.id) && models.length >= MAX_CUSTOM_MODELS) {
        throw new EngineError('invalid-params', 'Too many models in the library');
    }
    copyInto(USER_MODELS_DIR, modelFiles(showFolder, model.id));
    writeJsonFileAtomic(LIST, [...models.filter((item) => item.id !== model.id), model]);
}

/** Copies the files of a library model into a show */
export function copyFromLibrary(showFolder: string, id: string): CustomModel {
    const model = listLibraryModels().find((item) => item.id === id);
    const files = libraryFiles(id);
    if (model === undefined || files.length === 0) {
        throw new EngineError('file-not-found', 'The model is not in the library');
    }
    copyInto(path.join(showFolder, MODELS_FOLDER), files);
    return model;
}

/** Changes the details of a model only in the library */
export function updateInLibrary(model: CustomModel): void {
    writeJsonFileAtomic(LIST, listLibraryModels().map((item) => item.id === model.id ? model : item));
}

export function removeFromLibrary(id: string): void {
    libraryFiles(id).forEach((file) => fs.rmSync(file, { force: true }));
    writeJsonFileAtomic(LIST, listLibraryModels().filter((item) => item.id !== id));
}
