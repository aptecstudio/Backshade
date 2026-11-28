/**
 * Models imported into a show: .obj files kept in its models/ folder, with
 * the unit of their measures and the axis that points up, which the format
 * does not tell.
 */

/** Folder of the imported models inside a show */
export const MODELS_FOLDER = 'models';

export const MODEL_UNITS = ['m', 'cm', 'mm'] as const;
export type ModelUnit = typeof MODEL_UNITS[number];

export const MODEL_AXES = ['y', 'z'] as const;
export type ModelAxis = typeof MODEL_AXES[number];

/** Meters of a unit */
export const UNIT_METERS: Readonly<Record<ModelUnit, number>> = { m: 1, cm: 0.01, mm: 0.001 };

/** Largest file accepted, in bytes, and most imported models of a show */
export const MODEL_MAX_BYTES = 30 * 1024 * 1024;
export const MAX_CUSTOM_MODELS = 200;

export interface CustomModel {
    /** Also the name of its files: "custom-" and hexadecimal digits */
    id: string;
    name: string;
    unit: ModelUnit;
    up: ModelAxis;
    /** Size along X, Y and Z as written in the file */
    size: [number, number, number];
}

export const CUSTOM_ID = /^custom-[0-9a-f]{8,32}$/;

/** Width, height and depth in meters */
export function modelDimensions(size: CustomModel['size'], unit: ModelUnit, up: ModelAxis): [number, number, number] {
    const [x, y, z] = size.map((value) => value * UNIT_METERS[unit]);
    return up === 'y' ? [x, y, z] : [x, z, y];
}

/** Reads the imported models of a show file: invalid ones are dropped */
export function normalizeCustomModels(value: unknown): CustomModel[] {
    const models: CustomModel[] = [];
    const ids = new Set<string>();
    for (const item of Array.isArray(value) ? value.slice(0, MAX_CUSTOM_MODELS) : []) {
        const entry = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof CustomModel, unknown>>;
        const size = Array.isArray(entry.size) ? entry.size as unknown[] : [];
        if (typeof entry.id !== 'string' || !CUSTOM_ID.test(entry.id) || ids.has(entry.id) || typeof entry.name !== 'string') {
            continue;
        }
        ids.add(entry.id);
        models.push({
            id: entry.id,
            name: entry.name.slice(0, 100),
            unit: MODEL_UNITS.includes(entry.unit as ModelUnit) ? entry.unit as ModelUnit : 'm',
            up: MODEL_AXES.includes(entry.up as ModelAxis) ? entry.up as ModelAxis : 'y',
            size: [0, 1, 2].map((index) => typeof size[index] === 'number' && Number.isFinite(size[index]) ? size[index] : 0) as CustomModel['size']
        });
    }
    return models;
}
