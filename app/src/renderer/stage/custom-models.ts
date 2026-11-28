/**
 * The imported models of the open show among the models of the stage: their
 * entries beside the bundled ones, and their names.
 */

import { modelDimensions, type CustomModel } from '../../shared/stage/custom-model.js';
import type { ModelInfo } from './model-library.js';

const names = new Map<string, string>();

/** Name of an imported model, undefined for the bundled ones */
export function customName(id: string): string | undefined {
    return names.get(id);
}

/** Puts the imported models of a show in the list of the models, in place of those there */
export function useCustomModels(models: Map<string, ModelInfo>, custom: readonly CustomModel[]): void {
    for (const [id, info] of models) {
        if (info.custom !== undefined) {
            models.delete(id);
            names.delete(id);
        }
    }
    for (const model of custom) {
        names.set(model.id, model.name);
        models.set(model.id, { id: model.id, category: 'custom', file: '', width: modelDimensions(model.size, model.unit, model.up)[0], custom: model });
    }
}
