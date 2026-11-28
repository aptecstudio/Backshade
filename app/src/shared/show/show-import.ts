/**
 * Import from another show: scenes, chasers, fixtures (with matrices and
 * groups), audio (playlist items and files), video (outputs, text gobos,
 * timers and files), images, operators and the 3D stage (its scenery and
 * its placed fixtures). Every item lists the items it
 * needs, which are imported with it; an item that takes a place already used
 * in the open show has a conflict, solved by adding it elsewhere, replacing
 * what is there or skipping it.
 */

/** Categories of the import dialog */
export const IMPORT_CATEGORIES = ['scenes', 'chasers', 'fixtures', 'audio', 'video', 'images', 'operators', 'stage'] as const;

export type ImportCategory = typeof IMPORT_CATEGORIES[number];

/** Kind of an importable item */
export type ImportItemKind =
    | 'scene' | 'chaser'
    | 'fixture' | 'matrix' | 'group'
    | 'audioItem' | 'audioFile'
    | 'videoOutput' | 'gobo' | 'timer' | 'videoFile'
    | 'imageFile'
    | 'operator'
    | 'stageScenery' | 'stageFixtures';

/** Category of every kind */
export const IMPORT_KIND_CATEGORY: Readonly<Record<ImportItemKind, ImportCategory>> = {
    scene: 'scenes',
    chaser: 'chasers',
    fixture: 'fixtures',
    matrix: 'fixtures',
    group: 'fixtures',
    audioItem: 'audio',
    audioFile: 'audio',
    videoOutput: 'video',
    gobo: 'video',
    timer: 'video',
    videoFile: 'video',
    imageFile: 'images',
    operator: 'operators',
    stageScenery: 'stage',
    stageFixtures: 'stage'
};

/**
 * Solution of a conflict:
 * - add: elsewhere (first free slot, free address, new file or operator name);
 * - replace: in place of what is there;
 * - skip: not imported (a skipped file uses the file of the open show).
 */
export const CONFLICT_RESOLUTIONS = ['add', 'replace', 'skip'] as const;

export type ConflictResolution = typeof CONFLICT_RESOLUTIONS[number];

/** What an imported item would collide with */
export type ImportConflictKind = 'slot' | 'address' | 'file' | 'name' | 'stage';

export interface ImportConflict {
    kind: ImportConflictKind;
    /** What is in the open show, for example the scene in the slot or the fixtures on the addresses */
    with: string;
    /** Solutions allowed */
    resolutions: ConflictResolution[];
}

/** Item that can be imported */
export interface ImportItem {
    /** Unique key: kind and identifier (the file path for media) */
    key: string;
    kind: ImportItemKind;
    label: string;
    /** Secondary text: slot, address, file */
    detail: string;
    /** Keys of the items imported with this one */
    requires: string[];
    conflict: ImportConflict | null;
}

/** Content of the source show that can be imported */
export interface ImportCatalog {
    showName: string;
    items: ImportItem[];
}

/** Item chosen, with the solution of its conflict */
export interface ImportChoice {
    key: string;
    resolution: ConflictResolution;
}

/** Result of an import */
export interface ImportResult {
    imported: number;
    skipped: number;
}

/** Key of an item */
export function importKey(kind: ImportItemKind, id: string): string {
    return `${kind}:${id}`;
}

/**
 * Items imported for a choice: the chosen items and, recursively, the
 * items they need.
 */
export function withRequirements(items: readonly ImportItem[], chosen: Iterable<string>): Set<string> {
    const byKey = new Map(items.map((item) => [item.key, item]));
    const result = new Set<string>();
    const pending = [...chosen];
    while (pending.length > 0) {
        const key = pending.pop()!;
        const item = byKey.get(key);
        if (item === undefined || result.has(key)) {
            continue;
        }
        result.add(key);
        pending.push(...item.requires);
    }
    return result;
}
