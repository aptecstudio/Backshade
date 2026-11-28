/**
 * Stage layout of a show: the objects placed in the 3D stage. Saved in
 * show.json under "stage". Meters, Y up, front towards +Z (the audience);
 * rotations in degrees, applied in X, Y, Z order.
 */

/** Step of the positions on the grid, in meters */
export const STAGE_GRID = 0.2;

/** Step of the height of an adjustable stand, in meters */
export const STAGE_LIFT = 0.1;

/** Highest adjustable height accepted, in meters */
const MAX_HEIGHT = 20;

/** Step of the rotations, in degrees */
export const STAGE_ANGLE = 15;

/** Farthest position from the centre, in meters */
export const STAGE_LIMIT = 50;

/** Most objects of a stage */
export const MAX_STAGE_OBJECTS = 1000;

export type StageVector = [number, number, number];

/** Object placed in the stage */
export interface StageObject {
    /** Unique identifier */
    id: string;
    /** Identifier of the model, for example "truss-2m" */
    model: string;
    position: StageVector;
    rotation: StageVector;
    /** Patched fixture shown by the object, null for scenery */
    fixture: string | null;
    /** Truss the object hangs from or stand it is mounted on, null when it stands by itself */
    hungOn: string | null;
    /** Height of an adjustable stand in meters, null for its lowest */
    height: number | null;
}

/** Stage section of show.json */
export interface ShowStage {
    objects: StageObject[];
}

/** Empty stage of a new show */
export const EMPTY_STAGE: ShowStage = { objects: [] };

const MODEL_ID = /^[a-z0-9-]{1,64}$/;

function vector(value: unknown, limit: number): StageVector {
    const input = Array.isArray(value) ? value as unknown[] : [];
    return [0, 1, 2].map((index) => {
        const item = input[index];
        const number = typeof item === 'number' && Number.isFinite(item) ? item : 0;
        return Math.round(Math.max(-limit, Math.min(limit, number)) * 10000) / 10000;
    }) as StageVector;
}

/**
 * Reads the stage of a file or of a request: invalid objects are dropped, a
 * patched fixture is shown once and links to missing objects are cleared.
 */
export function normalizeStage(value: unknown): ShowStage {
    const input = typeof value === 'object' && value !== null ? value as { objects?: unknown } : {};
    const objects: StageObject[] = [];
    const ids = new Set<string>();
    const fixtures = new Set<string>();
    for (const item of Array.isArray(input.objects) ? input.objects.slice(0, MAX_STAGE_OBJECTS) : []) {
        const entry = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof StageObject, unknown>>;
        const fixture = typeof entry.fixture === 'string' && entry.fixture !== '' ? entry.fixture : null;
        if (typeof entry.id !== 'string' || entry.id === '' || ids.has(entry.id)
            || typeof entry.model !== 'string' || !MODEL_ID.test(entry.model)
            || (fixture !== null && fixtures.has(fixture))) {
            console.warn('Invalid stage object ignored');
            continue;
        }
        ids.add(entry.id);
        if (fixture !== null) {
            fixtures.add(fixture);
        }
        objects.push({
            id: entry.id,
            model: entry.model,
            position: vector(entry.position, STAGE_LIMIT),
            rotation: vector(entry.rotation, 360),
            fixture,
            hungOn: typeof entry.hungOn === 'string' ? entry.hungOn : null,
            height: typeof entry.height === 'number' && Number.isFinite(entry.height) ? Math.max(0, Math.min(MAX_HEIGHT, entry.height)) : null
        });
    }
    return { objects: objects.map((object) => object.hungOn === null || (object.hungOn !== object.id && ids.has(object.hungOn)) ? object : { ...object, hungOn: null }) };
}
