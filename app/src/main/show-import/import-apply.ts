/**
 * Applies an import: builds the new content of the open show from the
 * chosen items of the source show. Imported items get new identifiers
 * (an item that replaces another one keeps the identifier of the replaced
 * one, so references to it keep working); references between imported
 * items, media paths and the DMX channels of moved fixtures are rewritten.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ShowAudio } from '../../shared/audio/audio';
import { CHASER_SLOTS, SCENE_SLOTS, type Chaser, type Scene, type ShowMemories, type UniverseLevels } from '../../shared/console/memories';
import { findFreeAddress, findFreeNumber, fixturesInRange, occupiedRanges } from '../../shared/patch/address-map';
import { matrixSegments } from '../../shared/patch/matrix';
import { MAX_UNIVERSE, type ShowPatch } from '../../shared/patch/patch';
import type { ShowOperator } from '../../shared/show/operators';
import { MODELS_FOLDER } from '../../shared/stage/custom-model';
import type { ShowStage } from '../../shared/stage/stage';
import { importKey, type ConflictResolution, type ImportCatalog, type ImportItemKind, type ImportResult } from '../../shared/show/show-import';
import type { LayerState, ShowVideo } from '../../shared/video/video';
import { definitionFile, SHOW_FIXTURES_FOLDER } from '../fixtures/fixture-library';
import { removeFixtures } from '../patch/patch-editor';
import { modelFiles } from '../stage/custom-model-files';
import { resolveMediaPath } from '../shows/media-library';
import { mediaItemKind, type ImportShow } from './import-catalog';

/** New content of the open show and the media files to copy */
export interface ImportPlan {
    patch: ShowPatch | null;
    memories: ShowMemories | null;
    audio: ShowAudio | null;
    video: ShowVideo | null;
    operators: ShowOperator[] | null;
    stage: ShowStage | null;
    /** Media copies, absolute paths */
    copies: Array<{ from: string; to: string }>;
    result: ImportResult;
}

/** Channels of a source fixture or matrix part and where they go */
interface ChannelMove {
    universe: number;
    address: number;
    count: number;
    toUniverse: number;
    toAddress: number;
}

function firstFree(used: ReadonlySet<number>, size: number): number | null {
    for (let slot = 1; slot <= size; slot++) {
        if (!used.has(slot)) {
            return slot;
        }
    }
    return null;
}

/** Name not used yet: "Name", "Name 2", "Name 3" */
function uniqueName(name: string, used: readonly string[]): string {
    const taken = new Set(used.map((item) => item.toLowerCase()));
    let candidate = name;
    for (let index = 2; taken.has(candidate.toLowerCase()); index++) {
        candidate = `${name} ${index}`;
    }
    return candidate;
}

/**
 * Builds the plan of an import.
 * @param selected - Keys of the items to import, requirements included
 * @param resolutions - Solution chosen for the items with a conflict
 */
export function planImport(
    source: ImportShow,
    target: ImportShow,
    catalog: ImportCatalog,
    selected: ReadonlySet<string>,
    resolutions: ReadonlyMap<string, ConflictResolution>
): ImportPlan {
    const from = source.document;
    const to = target.document;
    const byKey = new Map(catalog.items.map((item) => [item.key, item]));
    const result: ImportResult = { imported: 0, skipped: 0 };
    const chosen = (kind: ImportItemKind, id: string): boolean => selected.has(importKey(kind, id)) && byKey.has(importKey(kind, id));
    const decide = (kind: ImportItemKind, id: string): ConflictResolution | null => {
        const item = byKey.get(importKey(kind, id));
        return item?.conflict === null ? null : resolutions.get(importKey(kind, id)) ?? 'add';
    };
    const skip = (): void => {
        result.skipped += 1;
    };
    const done = (): void => {
        result.imported += 1;
    };

    // Media: same path when possible, "name 2.ext" to keep both files
    const files = new Map<string, string>();
    const copies: ImportPlan['copies'] = [];
    const planned = new Set<string>();
    for (const item of catalog.items) {
        const kind = mediaItemKind(item.detail);
        if (item.kind !== kind || !selected.has(item.key)) {
            continue;
        }
        const file = item.detail;
        const resolution = item.conflict === null ? null : resolutions.get(item.key) ?? 'add';
        let destination = file;
        if (resolution === 'skip') {
            files.set(file, file);
            skip();
            continue;
        }
        if (resolution === 'add') {
            const extension = path.posix.extname(file);
            const base = file.slice(0, file.length - extension.length);
            for (let index = 2; fs.existsSync(resolveMediaPath(target.folder, destination)) || planned.has(destination); index++) {
                destination = `${base} ${index}${extension}`;
            }
        }
        files.set(file, destination);
        planned.add(destination);
        // A file without conflict that already exists has the same content: nothing to copy
        if (resolution !== null || !fs.existsSync(resolveMediaPath(target.folder, destination))) {
            copies.push({ from: resolveMediaPath(source.folder, file), to: resolveMediaPath(target.folder, destination) });
        }
        done();
    }
    const mapFile = (file: string): string => files.get(file) ?? file;

    // Patch: fixtures and matrices on their addresses, moved or replacing what is there
    let patch: ShowPatch | null = null;
    const patchIds = new Map<string, string>();
    const moves: ChannelMove[] = [];
    const work = (): ShowPatch => {
        patch ??= structuredClone(to.patch);
        return patch;
    };
    const numbers = (current: ShowPatch): Array<{ number: number }> => [...current.fixtures, ...current.matrices];
    for (const fixture of from.patch.fixtures) {
        if (!chosen('fixture', fixture.id)) {
            continue;
        }
        const resolution = decide('fixture', fixture.id);
        if (resolution === 'skip') {
            skip();
            continue;
        }
        let current = work();
        let universe = fixture.universe;
        let address = fixture.address;
        const hits = fixturesInRange(occupiedRanges(current), fixture);
        if (hits.length > 0 && resolution === 'replace') {
            current = removeFixtures(current, hits.map((hit) => hit.id));
        } else if (hits.length > 0) {
            let found: number | null = null;
            for (universe = fixture.universe; universe <= MAX_UNIVERSE && found === null; universe++) {
                found = findFreeAddress(occupiedRanges(current), universe, fixture.channelCount);
            }
            if (found === null) {
                skip();
                continue;
            }
            universe -= 1;
            address = found;
        }
        // A definition the other show carries comes with the fixture
        const definition = definitionFile(path.join(source.folder, SHOW_FIXTURES_FOLDER), fixture.definition);
        const kept = definitionFile(path.join(target.folder, SHOW_FIXTURES_FOLDER), fixture.definition);
        if (fs.existsSync(definition) && !fs.existsSync(kept) && !copies.some((copy) => copy.to === kept)) {
            copies.push({ from: definition, to: kept });
        }
        const id = randomUUID();
        patchIds.set(fixture.id, id);
        moves.push({ universe: fixture.universe, address: fixture.address, count: fixture.channelCount, toUniverse: universe, toAddress: address });
        current.fixtures.push({ ...fixture, id, universe, address, number: findFreeNumber(numbers(current), 1, fixture.number) });
        patch = current;
        done();
    }
    for (const matrix of from.patch.matrices) {
        if (!chosen('matrix', matrix.id)) {
            continue;
        }
        const resolution = decide('matrix', matrix.id);
        if (resolution === 'skip') {
            skip();
            continue;
        }
        let current = work();
        let placed = { ...matrix };
        const hits = matrixSegments(matrix).flatMap((segment) => fixturesInRange(occupiedRanges(current), segment));
        if (hits.length > 0 && resolution === 'replace') {
            current = removeFixtures(current, hits.map((hit) => hit.id));
        } else if (hits.length > 0) {
            // A matrix that does not fit goes to the first universe after all the used ones
            const universe = Math.max(0, ...occupiedRanges(current).map((range) => range.universe)) + 1;
            if (universe + matrixSegments(matrix).length - 1 > MAX_UNIVERSE) {
                skip();
                continue;
            }
            placed = { ...matrix, universe, address: 1 };
        }
        const id = randomUUID();
        patchIds.set(matrix.id, id);
        const before = matrixSegments(matrix);
        matrixSegments(placed).forEach((segment, index) => moves.push({
            universe: before[index].universe,
            address: before[index].address,
            count: segment.channelCount,
            toUniverse: segment.universe,
            toAddress: segment.address
        }));
        current.matrices.push({ ...placed, id, number: findFreeNumber(numbers(current), 1, matrix.number) });
        patch = current;
        done();
    }
    for (const group of from.patch.groups) {
        if (!chosen('group', group.id)) {
            continue;
        }
        const current = work();
        const used = current.groups.map((item) => ({ number: item.number }));
        const members = group.fixtures.flatMap((id) => patchIds.has(id) ? [patchIds.get(id)!] : []);
        current.groups.push({ ...group, id: randomUUID(), number: findFreeNumber(used, 1, group.number), fixtures: members });
        done();
    }
    const moveLevels = (levels: readonly UniverseLevels[]): UniverseLevels[] => {
        const out = new Map<number, Map<number, number>>();
        for (const universe of levels) {
            for (const [channel, value] of universe.channels) {
                const move = moves.find((item) => item.universe === universe.universe && channel >= item.address && channel < item.address + item.count);
                const target = move === undefined ? { universe: universe.universe, channel } : { universe: move.toUniverse, channel: move.toAddress + channel - move.address };
                const map = out.get(target.universe) ?? new Map<number, number>();
                map.set(target.channel, value);
                out.set(target.universe, map);
            }
        }
        return [...out].sort((a, b) => a[0] - b[0]).map(([universe, map]) => ({ universe, channels: [...map].sort((a, b) => a[0] - b[0]) }));
    };

    // Audio playlist and video
    let audio: ShowAudio | null = null;
    const audioIds = new Map<string, string>();
    for (const item of from.audio.items) {
        if (chosen('audioItem', item.id)) {
            audio ??= structuredClone(to.audio);
            const id = randomUUID();
            audioIds.set(item.id, id);
            audio.items.push({ ...item, id, file: mapFile(item.file) });
            done();
        }
    }
    let video: ShowVideo | null = null;
    const videoIds = new Map<string, string>();
    const editVideo = (): ShowVideo => {
        video ??= structuredClone(to.video);
        return video;
    };
    for (const output of from.video.outputs) {
        if (chosen('videoOutput', output.id)) {
            const id = randomUUID();
            videoIds.set(output.id, id);
            editVideo().outputs.push({ ...output, id });
            done();
        }
    }
    for (const gobo of from.video.gobos) {
        if (chosen('gobo', gobo.id)) {
            const id = randomUUID();
            videoIds.set(gobo.id, id);
            editVideo().gobos.push({ ...gobo, id, maskFile: gobo.maskFile === '' ? '' : mapFile(gobo.maskFile) });
            done();
        }
    }
    for (const timer of from.video.timers) {
        if (chosen('timer', timer.id)) {
            const id = randomUUID();
            videoIds.set(timer.id, id);
            editVideo().timers.push({ ...timer, id });
            done();
        }
    }
    const moveLayer = (layer: LayerState): LayerState => {
        const source = layer.source;
        if (source === null || source.kind === 'input') {
            return layer;
        }
        if (source.kind === 'video' || source.kind === 'image') {
            return { ...layer, source: { ...source, file: mapFile(source.file) } };
        }
        const id = videoIds.get(source.kind === 'gobo' ? source.gobo : source.timer);
        if (id === undefined) {
            return { ...layer, source: null };
        }
        return { ...layer, source: source.kind === 'gobo' ? { kind: 'gobo', gobo: id } : { kind: 'timer', timer: id } };
    };

    // Scenes and chasers: their slot, the first free slot, or in place of the scene there
    let memories: ShowMemories | null = null;
    const sceneIds = new Map<string, string>();
    const place = <T extends Scene | Chaser>(list: T[], item: T, kind: 'scene' | 'chaser', size: number): { id: string; slot: number } | null => {
        const resolution = decide(kind, item.id);
        if (resolution === 'skip') {
            return null;
        }
        const occupant = list.findIndex((other) => other.slot === item.slot);
        if (occupant < 0) {
            return { id: randomUUID(), slot: item.slot };
        }
        if (resolution === 'replace') {
            const [removed] = list.splice(occupant, 1);
            return { id: removed.id, slot: item.slot };
        }
        const slot = firstFree(new Set(list.map((other) => other.slot)), size);
        return slot === null ? null : { id: randomUUID(), slot };
    };
    for (const scene of [...from.memories.scenes].sort((a, b) => a.slot - b.slot)) {
        if (!chosen('scene', scene.id)) {
            continue;
        }
        memories ??= structuredClone(to.memories);
        const spot = place(memories.scenes, scene, 'scene', SCENE_SLOTS);
        if (spot === null) {
            skip();
            continue;
        }
        sceneIds.set(scene.id, spot.id);
        const matrices = Object.fromEntries(Object.entries(scene.matrices).flatMap(([id, effect]) => patchIds.has(id)
            ? [[patchIds.get(id)!, { ...effect, media: effect.media === '' ? '' : mapFile(effect.media) }]]
            : []));
        const sceneVideo = Object.fromEntries(Object.entries(scene.video).flatMap(([id, layers]) => videoIds.has(id) ? [[videoIds.get(id)!, layers.map(moveLayer)]] : []));
        memories.scenes.push({
            ...scene,
            ...spot,
            levels: moveLevels(scene.levels),
            matrices,
            audio: scene.audio === null ? null : audioIds.get(scene.audio) ?? null,
            video: sceneVideo
        });
        done();
    }
    for (const chaser of [...from.memories.chasers].sort((a, b) => a.slot - b.slot)) {
        if (!chosen('chaser', chaser.id)) {
            continue;
        }
        memories ??= structuredClone(to.memories);
        const spot = place(memories.chasers, chaser, 'chaser', CHASER_SLOTS);
        if (spot === null) {
            skip();
            continue;
        }
        memories.chasers.push({ ...chaser, ...spot, steps: chaser.steps.flatMap((id) => sceneIds.has(id) ? [sceneIds.get(id)!] : []) });
        done();
    }
    if (memories !== null) {
        memories.scenes.sort((a, b) => a.slot - b.slot);
        memories.chasers.sort((a, b) => a.slot - b.slot);
    }

    // Operators keep their PIN; a name already used gets a number
    let operators: ShowOperator[] | null = null;
    for (const operator of from.operators) {
        if (!chosen('operator', operator.id)) {
            continue;
        }
        const resolution = decide('operator', operator.id);
        if (resolution === 'skip') {
            skip();
            continue;
        }
        operators ??= structuredClone(to.operators);
        const same = operators.findIndex((item) => item.name.toLowerCase() === operator.name.toLowerCase());
        if (same >= 0 && resolution === 'replace') {
            operators[same] = { ...operator, id: operators[same].id };
        } else {
            operators.push({ ...operator, id: randomUUID(), name: uniqueName(operator.name, operators.map((item) => item.name)) });
        }
        done();
    }

    // 3D stage: scenery first, so the fixtures can hang on it; every object gets a new identifier
    let stage: ShowStage | null = null;
    const stageIds = new Map<string, string>();
    for (const kind of ['stageScenery', 'stageFixtures'] as const) {
        if (!chosen(kind, 'stage')) {
            continue;
        }
        const resolution = decide(kind, 'stage');
        if (resolution === 'skip') {
            skip();
            continue;
        }
        const scenery = kind === 'stageScenery';
        stage ??= structuredClone(to.stage);
        if (resolution === 'replace') {
            stage.objects = stage.objects.filter((object) => (object.fixture === null) !== scenery);
        }
        for (const object of from.stage.objects) {
            if ((object.fixture === null) !== scenery) {
                continue;
            }
            // A fixture that was not imported is not placed
            const fixture = object.fixture === null ? null : patchIds.get(object.fixture);
            if (fixture === undefined) {
                continue;
            }
            // An imported model comes with its files, under the same identifier
            const model = from.stage.models.find((item) => item.id === object.model);
            if (model !== undefined && !stage.models.some((item) => item.id === model.id)) {
                stage.models.push(model);
                for (const file of modelFiles(source.folder, model.id)) {
                    copies.push({ from: file, to: path.join(target.folder, MODELS_FOLDER, path.basename(file)) });
                }
            }
            const id = randomUUID();
            stageIds.set(object.id, id);
            stage.objects.push({ ...object, id, fixture, hungOn: object.hungOn === null ? null : stageIds.get(object.hungOn) ?? null });
        }
        done();
    }

    return { patch, memories, audio, video, operators, stage, copies, result };
}
