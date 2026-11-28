/**
 * Catalog of an import: the items of the source show that can be
 * imported into the open show, the items each one needs and the places
 * they would take that are already used.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { occupiedRanges, overlaps, type AddressRange, type PlacedRange } from '../../shared/patch/address-map';
import { matrixSegments } from '../../shared/patch/matrix';
import { mediaKindOf } from '../../shared/show/media-kinds';
import type { ShowDocument } from '../../shared/show/show-document';
import { importKey, type ConflictResolution, type ImportCatalog, type ImportConflict, type ImportItem, type ImportItemKind } from '../../shared/show/show-import';
import type { LayerState } from '../../shared/video/video';
import { listMedia, resolveMediaPath } from '../shows/media-library';

/** A show read from its folder */
export interface ImportShow {
    folder: string;
    document: ShowDocument;
}

const ALL: ConflictResolution[] = ['add', 'replace', 'skip'];

/** Kind of the import item of a media file, null for unknown files */
export function mediaItemKind(file: string): ImportItemKind | null {
    const kind = mediaKindOf(file);
    return kind === 'audio' ? 'audioFile' : kind === 'video' ? 'videoFile' : kind === 'image' ? 'imageFile' : null;
}

function fileHash(file: string): string {
    const hash = createHash('sha256');
    const descriptor = fs.openSync(file, 'r');
    try {
        const buffer = Buffer.alloc(1024 * 1024);
        for (let read = fs.readSync(descriptor, buffer); read > 0; read = fs.readSync(descriptor, buffer)) {
            hash.update(buffer.subarray(0, read));
        }
    } finally {
        fs.closeSync(descriptor);
    }
    return hash.digest('hex');
}

/** The file exists in both shows with the same content */
export function sameMediaFile(source: ImportShow, target: ImportShow, file: string): boolean {
    const from = resolveMediaPath(source.folder, file);
    const to = resolveMediaPath(target.folder, file);
    if (!fs.existsSync(to)) {
        return false;
    }
    return fs.statSync(from).size === fs.statSync(to).size && fileHash(from) === fileHash(to);
}

/** Address of a fixture as "universe.address" */
function addressText(range: Pick<AddressRange, 'universe' | 'address'>): string {
    return `${range.universe}.${String(range.address).padStart(3, '0')}`;
}

function addressConflict(ranges: readonly AddressRange[], occupied: readonly PlacedRange[]): ImportConflict | null {
    const hits = occupied.filter((placed) => ranges.some((range) => overlaps(range, placed)));
    if (hits.length === 0) {
        return null;
    }
    return { kind: 'address', with: [...new Set(hits.map((hit) => hit.name))].join(', '), resolutions: ALL };
}

/** Media files used by the layers of a video program */
function layerFiles(layers: readonly LayerState[]): string[] {
    return layers.flatMap((layer) => layer.source !== null && (layer.source.kind === 'video' || layer.source.kind === 'image') ? [layer.source.file] : []);
}

/**
 * Builds the catalog.
 * @param currentOperator - Operator who entered the open show: it cannot be replaced
 */
export function buildCatalog(source: ImportShow, target: ImportShow, currentOperator: string | null): ImportCatalog {
    const from = source.document;
    const to = target.document;
    const items: ImportItem[] = [];
    const media = new Map(listMedia(source.folder).map((item) => [item.file, item]));
    const mediaKey = (file: string): string[] => {
        const kind = mediaItemKind(file);
        return kind !== null && media.has(file) ? [importKey(kind, file)] : [];
    };

    // Media files: a file with the same path and another content collides
    for (const item of media.values()) {
        const kind = mediaItemKind(item.file);
        if (kind === null) {
            continue;
        }
        const exists = fs.existsSync(resolveMediaPath(target.folder, item.file));
        const conflict: ImportConflict | null = exists && !sameMediaFile(source, target, item.file)
            ? { kind: 'file', with: item.file, resolutions: ALL }
            : null;
        items.push({ key: importKey(kind, item.file), kind, label: item.name, detail: item.file, requires: [], conflict });
    }

    // Fixtures, matrices and groups
    const occupied = occupiedRanges(to.patch);
    const sourceRanges = occupiedRanges(from.patch);
    for (const fixture of from.patch.fixtures) {
        items.push({
            key: importKey('fixture', fixture.id),
            kind: 'fixture',
            label: `${fixture.number} ${fixture.name}`,
            detail: addressText(fixture),
            requires: [],
            conflict: addressConflict([fixture], occupied)
        });
    }
    for (const matrix of from.patch.matrices) {
        items.push({
            key: importKey('matrix', matrix.id),
            kind: 'matrix',
            label: `${matrix.number} ${matrix.name}`,
            detail: `${addressText(matrix)} ${matrix.width}x${matrix.height}`,
            requires: [],
            conflict: addressConflict(matrixSegments(matrix), occupied)
        });
    }
    const patchKey = (id: string): string[] => from.patch.fixtures.some((item) => item.id === id) ? [importKey('fixture', id)]
        : from.patch.matrices.some((item) => item.id === id) ? [importKey('matrix', id)] : [];
    for (const group of from.patch.groups) {
        items.push({
            key: importKey('group', group.id),
            kind: 'group',
            label: `${group.number} ${group.name}`,
            detail: '',
            requires: group.fixtures.flatMap(patchKey),
            conflict: null
        });
    }

    // Audio playlist and video
    for (const item of from.audio.items) {
        items.push({ key: importKey('audioItem', item.id), kind: 'audioItem', label: item.name, detail: item.file, requires: mediaKey(item.file), conflict: null });
    }
    for (const output of from.video.outputs) {
        items.push({ key: importKey('videoOutput', output.id), kind: 'videoOutput', label: output.name, detail: `${output.width}x${output.height}`, requires: [], conflict: null });
    }
    for (const gobo of from.video.gobos) {
        const requires = gobo.mask === 'image' && gobo.maskFile !== '' ? mediaKey(gobo.maskFile) : [];
        items.push({ key: importKey('gobo', gobo.id), kind: 'gobo', label: gobo.name, detail: '', requires, conflict: null });
    }
    for (const timer of from.video.timers) {
        items.push({ key: importKey('timer', timer.id), kind: 'timer', label: timer.name, detail: '', requires: [], conflict: null });
    }

    // Scenes: they need the fixtures of their channels, their matrices, audio and video
    const sceneSlots = new Map(to.memories.scenes.map((scene) => [scene.slot, scene.name]));
    for (const scene of from.memories.scenes) {
        const requires = new Set<string>();
        for (const levels of scene.levels) {
            for (const [channel] of levels.channels) {
                const owner = sourceRanges.find((range) => overlaps(range, { universe: levels.universe, address: channel, channelCount: 1 }));
                if (owner !== undefined) {
                    patchKey(owner.id).forEach((key) => requires.add(key));
                }
            }
        }
        for (const [matrix, effect] of Object.entries(scene.matrices)) {
            patchKey(matrix).forEach((key) => requires.add(key));
            if (effect.media !== '') {
                mediaKey(effect.media).forEach((key) => requires.add(key));
            }
        }
        if (scene.audio !== null && from.audio.items.some((item) => item.id === scene.audio)) {
            requires.add(importKey('audioItem', scene.audio));
        }
        for (const [output, layers] of Object.entries(scene.video)) {
            if (from.video.outputs.some((item) => item.id === output)) {
                requires.add(importKey('videoOutput', output));
            }
            layerFiles(layers).flatMap(mediaKey).forEach((key) => requires.add(key));
            for (const layer of layers) {
                if (layer.source?.kind === 'gobo') {
                    requires.add(importKey('gobo', layer.source.gobo));
                } else if (layer.source?.kind === 'timer') {
                    requires.add(importKey('timer', layer.source.timer));
                }
            }
        }
        for (const output of Object.keys(scene.mapping)) {
            if (from.video.outputs.some((item) => item.id === output)) {
                requires.add(importKey('videoOutput', output));
            }
        }
        const occupant = sceneSlots.get(scene.slot);
        items.push({
            key: importKey('scene', scene.id),
            kind: 'scene',
            label: scene.name,
            detail: `S${scene.slot}`,
            requires: [...requires],
            conflict: occupant === undefined ? null : { kind: 'slot', with: occupant, resolutions: ALL }
        });
    }
    const chaserSlots = new Map(to.memories.chasers.map((chaser) => [chaser.slot, chaser.name]));
    for (const chaser of from.memories.chasers) {
        const occupant = chaserSlots.get(chaser.slot);
        items.push({
            key: importKey('chaser', chaser.id),
            kind: 'chaser',
            label: chaser.name,
            detail: `C${chaser.slot}`,
            requires: [...new Set(chaser.steps)].filter((id) => from.memories.scenes.some((scene) => scene.id === id)).map((id) => importKey('scene', id)),
            conflict: occupant === undefined ? null : { kind: 'slot', with: occupant, resolutions: ALL }
        });
    }

    // Operators: a name already used collides; the operator who entered is never replaced
    for (const operator of from.operators) {
        const same = to.operators.find((item) => item.name.toLowerCase() === operator.name.toLowerCase());
        items.push({
            key: importKey('operator', operator.id),
            kind: 'operator',
            label: operator.name,
            detail: operator.admin ? 'admin' : '',
            requires: [],
            conflict: same === undefined ? null : { kind: 'name', with: same.name, resolutions: same.id === currentOperator ? ['add', 'skip'] : ALL }
        });
    }

    // The 3D stage in two parts: the scenery, and the fixtures with what they hang on
    const parts = [
        { kind: 'stageScenery', objects: from.stage.objects.filter((object) => object.fixture === null), there: to.stage.objects.filter((object) => object.fixture === null) },
        { kind: 'stageFixtures', objects: from.stage.objects.filter((object) => object.fixture !== null), there: to.stage.objects.filter((object) => object.fixture !== null) }
    ] as const;
    for (const { kind, objects, there } of parts) {
        if (objects.length === 0) {
            continue;
        }
        const scenery = kind === 'stageFixtures' && objects.some((object) => object.hungOn !== null) ? [importKey('stageScenery', 'stage')] : [];
        items.push({
            key: importKey(kind, 'stage'),
            kind,
            label: '',
            detail: String(objects.length),
            requires: [...objects.flatMap((object) => object.fixture === null ? [] : patchKey(object.fixture)), ...scenery],
            conflict: there.length === 0 ? null : { kind: 'stage', with: String(there.length), resolutions: ALL }
        });
    }

    // Requirements only point to items of the catalog
    const keys = new Set(items.map((item) => item.key));
    for (const item of items) {
        item.requires = item.requires.filter((key) => keys.has(key) && key !== item.key);
    }
    return { showName: from.name, items };
}
