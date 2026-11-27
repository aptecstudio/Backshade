/**
 * Open show: it is the only source of truth for the show data. It handles
 * creating, opening, saving, save as, closing and the periodic
 * recovery copy of unsaved changes.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { app } from 'electron';
import { SHOW_FOLDER_EXTENSION, type ShowDocument } from '../../shared/show/show-document';
import type { ShowAudio } from '../../shared/audio/audio';
import type { ShowMemories } from '../../shared/console/memories';
import type { ShowGrid } from '../../shared/grid/grid';
import type { ShowTimelines } from '../../shared/timeline/timeline';
import type { ShowVideo } from '../../shared/video/video';
import type { ShowMixers } from '../../shared/mixers/mixers';
import type { ShowMidi } from '../../shared/midi/midi';
import type { ShowOutput } from '../../shared/output/output-config';
import type { ShowPatch } from '../../shared/patch/patch';
import type { ShowOperator } from '../../shared/show/operators';
import { normalizeShowSettings, type ShowSettings } from '../../shared/show/show-settings';
import type { OpenShowResult, ShowSummary } from '../../shared/transport/engine-api';
import { copyFolder } from '../storage/copy-folder';
import { toFileName, uniquePath } from '../storage/file-names';
import { EngineError } from '../transport/engine-error';
import * as showFiles from './show-files';

// Interval of the recovery copy
const AUTOSAVE_INTERVAL_MS = 2 * 60 * 1000;

interface OpenShow {
    folder: string;
    document: ShowDocument;
    dirty: boolean;
}

/** Function called at every change of the open show */
export type ShowChangeListener = (show: ShowSummary | null) => void;

/** Result of opening a show, before the check of the missing resources */
export type SessionOpenResult = Omit<OpenShowResult, 'missingFixtures'>;

/** Part of the show content that changed; "all" when the show is opened, closed or recovered */
export type ContentPart = 'patch' | 'output' | 'memories' | 'grid' | 'audio' | 'video' | 'mixers' | 'midi' | 'timelines' | 'operators' | 'all';

/** Function called when a part of the show content may have changed */
export type ContentChangeListener = (part: ContentPart) => void;

export class ShowSession {
    private current: OpenShow | null = null;
    private readonly listener: ShowChangeListener;
    private autosaveTimer: NodeJS.Timeout | null = null;
    private readonly contentListeners: ContentChangeListener[] = [];

    constructor(listener: ShowChangeListener) {
        this.listener = listener;
    }

    /**
     * Registers a listener for the changes of the show content (patch, output).
     */
    onContentChange(listener: ContentChangeListener): void {
        this.contentListeners.push(listener);
    }

    /** Open show, or null */
    summary(): ShowSummary | null {
        if (this.current === null) {
            return null;
        }
        return {
            id: this.current.document.id,
            name: this.current.document.name,
            folder: this.current.folder,
            modifiedAt: this.current.document.modifiedAt,
            dirty: this.current.dirty
        };
    }

    /** There are unsaved changes */
    get dirty(): boolean {
        return this.current?.dirty === true;
    }

    /**
     * Creates a show by copying a template and opens it.
     * @param templateFolder - Template folder
     * @param exclude - Template entries not to copy (for example template.json)
     */
    create(name: string, parentFolder: string, templateFolder: string, exclude: readonly string[]): SessionOpenResult {
        this.requireClosedOrSaved();
        fs.mkdirSync(parentFolder, { recursive: true });
        const folder = uniquePath(parentFolder, toFileName(name), SHOW_FOLDER_EXTENSION);

        copyFolder(templateFolder, folder, [...showFiles.TRANSIENT_ENTRIES, ...exclude]);
        const now = new Date().toISOString();
        const document: ShowDocument = {
            ...showFiles.readShow(folder),
            id: randomUUID(),
            name: name.trim(),
            createdAt: now,
            modifiedAt: now,
            createdWith: app.getVersion(),
            // The operators of a template never pass to a new show: who creates it sets them up
            operators: []
        };
        showFiles.writeShow(folder, document, false);

        return this.open(folder);
    }

    /**
     * Opens the show of a folder.
     */
    open(folder: string): SessionOpenResult {
        this.requireClosedOrSaved();
        const document = showFiles.readShow(folder);
        const recoveryAvailable = showFiles.hasNewerAutosave(folder);

        this.closeQuietly();
        this.current = { folder, document, dirty: false };
        this.startAutosave();
        this.notify();
        this.notifyContent('all');

        return { show: this.requireSummary(), recoveryAvailable };
    }

    /**
     * Saves the open show.
     */
    save(): ShowSummary {
        const show = this.requireOpen();
        show.document = { ...show.document, modifiedAt: new Date().toISOString() };
        showFiles.writeShow(show.folder, show.document);
        showFiles.removeAutosave(show.folder);
        show.dirty = false;
        this.notify();
        return this.requireSummary();
    }

    /**
     * Saves the open show as a new show, with a new name and identifier,
     * and opens the copy.
     */
    saveAs(name: string, parentFolder: string): ShowSummary {
        const show = this.requireOpen();
        fs.mkdirSync(parentFolder, { recursive: true });
        const folder = uniquePath(parentFolder, toFileName(name), SHOW_FOLDER_EXTENSION);

        copyFolder(show.folder, folder, showFiles.TRANSIENT_ENTRIES);
        const now = new Date().toISOString();
        const document: ShowDocument = { ...show.document, id: randomUUID(), name: name.trim(), createdAt: now, modifiedAt: now };
        showFiles.writeShow(folder, document, false);

        this.current = { folder, document, dirty: false };
        this.notify();
        return this.requireSummary();
    }

    /**
     * Renames the open show; the change must be saved.
     */
    rename(name: string): ShowSummary {
        const show = this.requireOpen();
        const trimmed = name.trim();
        if (trimmed === '') {
            throw new EngineError('invalid-name', 'Empty name');
        }
        show.document = { ...show.document, name: trimmed };
        show.dirty = true;
        this.notify();
        return this.requireSummary();
    }

    /**
     * Folder of the open show.
     * @throws EngineError "no-show"
     */
    folder(): string {
        return this.requireOpen().folder;
    }

    /**
     * Settings of the open show.
     */
    settings(): ShowSettings {
        return this.requireOpen().document.settings;
    }

    /**
     * Changes the settings of the open show; the change must be saved.
     * Invalid values are corrected.
     */
    updateSettings(changes: Partial<ShowSettings>): ShowSettings {
        const show = this.requireOpen();
        const next = normalizeShowSettings({ ...show.document.settings, ...changes });
        if (JSON.stringify(next) !== JSON.stringify(show.document.settings)) {
            show.document = { ...show.document, settings: next };
            show.dirty = true;
            this.notify();
        }
        return next;
    }

    /**
     * Patch of the open show.
     */
    patch(): ShowPatch {
        return this.requireOpen().document.patch;
    }

    /**
     * Replaces the patch of the open show; the change must be saved.
     */
    setPatch(patch: ShowPatch): void {
        const show = this.requireOpen();
        if (patch === show.document.patch) {
            return;
        }
        show.document = { ...show.document, patch };
        show.dirty = true;
        this.notify();
        this.notifyContent('patch');
    }

    /**
     * Output configuration of the open show.
     */
    output(): ShowOutput {
        return this.requireOpen().document.output;
    }

    /**
     * Replaces the output configuration of the open show; the change must be saved.
     */
    setOutput(output: ShowOutput): void {
        const show = this.requireOpen();
        if (JSON.stringify(output) === JSON.stringify(show.document.output)) {
            return;
        }
        show.document = { ...show.document, output };
        show.dirty = true;
        this.notify();
        this.notifyContent('output');
    }

    /**
     * Scenes and chasers of the open show.
     */
    memories(): ShowMemories {
        return this.requireOpen().document.memories;
    }

    /**
     * Replaces the scenes and chasers of the open show; the change must be saved.
     */
    setMemories(memories: ShowMemories): void {
        const show = this.requireOpen();
        if (memories === show.document.memories) {
            return;
        }
        show.document = { ...show.document, memories };
        show.dirty = true;
        this.notify();
        this.notifyContent('memories');
    }

    /**
     * Audio player and playlist of the open show.
     */
    audio(): ShowAudio {
        return this.requireOpen().document.audio;
    }

    /**
     * Replaces the audio player and playlist; the change must be saved.
     */
    setAudio(audio: ShowAudio): void {
        const show = this.requireOpen();
        if (JSON.stringify(audio) === JSON.stringify(show.document.audio)) {
            return;
        }
        show.document = { ...show.document, audio };
        show.dirty = true;
        this.notify();
        this.notifyContent('audio');
    }

    /**
     * Video outputs of the open show.
     */
    video(): ShowVideo {
        return this.requireOpen().document.video;
    }

    /**
     * Replaces the video outputs; the change must be saved.
     */
    setVideo(video: ShowVideo): void {
        const show = this.requireOpen();
        if (JSON.stringify(video) === JSON.stringify(show.document.video)) {
            return;
        }
        show.document = { ...show.document, video };
        show.dirty = true;
        this.notify();
        this.notifyContent('video');
    }

    /**
     * External mixers of the open show.
     */
    mixers(): ShowMixers {
        return this.requireOpen().document.mixers;
    }

    /**
     * Replaces the mixers; the change must be saved.
     */
    setMixers(mixers: ShowMixers): void {
        const show = this.requireOpen();
        if (JSON.stringify(mixers) === JSON.stringify(show.document.mixers)) {
            return;
        }
        show.document = { ...show.document, mixers };
        show.dirty = true;
        this.notify();
        this.notifyContent('mixers');
    }

    /**
     * MIDI mappings of the open show.
     */
    midi(): ShowMidi {
        return this.requireOpen().document.midi;
    }

    /**
     * Replaces the MIDI mappings; the change must be saved.
     */
    setMidi(midi: ShowMidi): void {
        const show = this.requireOpen();
        if (JSON.stringify(midi) === JSON.stringify(show.document.midi)) {
            return;
        }
        show.document = { ...show.document, midi };
        show.dirty = true;
        this.notify();
        this.notifyContent('midi');
    }

    /**
     * Timelines of the open show.
     */
    timelines(): ShowTimelines {
        return this.requireOpen().document.timelines;
    }

    /**
     * Replaces the timelines of the open show; the change must be saved.
     */
    setTimelines(timelines: ShowTimelines): void {
        const show = this.requireOpen();
        show.document = { ...show.document, timelines };
        show.dirty = true;
        this.notify();
        this.notifyContent('timelines');
    }

    /**
     * Folder and content of the open show.
     */
    snapshot(): { folder: string; document: ShowDocument } {
        const show = this.requireOpen();
        return { folder: show.folder, document: show.document };
    }

    /**
     * Operators of the open show, or an empty list without a show.
     */
    operators(): ShowOperator[] {
        return this.current?.document.operators ?? [];
    }

    /**
     * Replaces the operators of the open show; the change must be saved.
     */
    setOperators(operators: ShowOperator[]): void {
        const show = this.requireOpen();
        show.document = { ...show.document, operators };
        show.dirty = true;
        this.notify();
        this.notifyContent('operators');
    }

    /**
     * Pages of the virtual console of the open show.
     */
    grid(): ShowGrid {
        return this.requireOpen().document.grid;
    }

    /**
     * Replaces the pages of the virtual console; the change must be saved.
     */
    setGrid(grid: ShowGrid): void {
        const show = this.requireOpen();
        if (JSON.stringify(grid) === JSON.stringify(show.document.grid)) {
            return;
        }
        show.document = { ...show.document, grid };
        show.dirty = true;
        this.notify();
        this.notifyContent('grid');
    }

    /**
     * Loads the recovery copy in place of the saved data.
     */
    recover(): ShowSummary {
        const show = this.requireOpen();
        show.document = showFiles.readAutosave(show.folder);
        show.dirty = true;
        this.notify();
        this.notifyContent('all');
        return this.requireSummary();
    }

    /**
     * Deletes the recovery copy.
     */
    discardRecovery(): void {
        showFiles.removeAutosave(this.requireOpen().folder);
    }

    /**
     * Closes the show. With unsaved changes discard is required, otherwise an error is thrown.
     */
    close(discard: boolean): void {
        if (this.current === null) {
            return;
        }
        if (this.current.dirty && !discard) {
            throw new EngineError('unsaved-changes', 'The show has unsaved changes');
        }
        showFiles.removeAutosave(this.current.folder);
        this.closeQuietly();
        this.notify();
        this.notifyContent('all');
    }

    /**
     * Stops the recovery copy, for example when the application quits.
     */
    dispose(): void {
        this.stopAutosave();
    }

    private closeQuietly(): void {
        this.stopAutosave();
        this.current = null;
    }

    private startAutosave(): void {
        this.stopAutosave();
        this.autosaveTimer = setInterval(() => this.autosave(), AUTOSAVE_INTERVAL_MS);
    }

    private stopAutosave(): void {
        if (this.autosaveTimer !== null) {
            clearInterval(this.autosaveTimer);
            this.autosaveTimer = null;
        }
    }

    /**
     * Writes the recovery copy if there are unsaved changes.
     */
    autosave(): void {
        if (this.current === null || !this.current.dirty) {
            return;
        }
        try {
            showFiles.writeAutosave(this.current.folder, this.current.document);
        } catch (error) {
            console.error('Recovery copy failed', error);
        }
    }

    /**
     * Prevents replacing a show with unsaved changes.
     */
    private requireClosedOrSaved(): void {
        if (this.current?.dirty === true) {
            throw new EngineError('unsaved-changes', 'The open show has unsaved changes');
        }
    }

    private requireOpen(): OpenShow {
        if (this.current === null) {
            throw new EngineError('no-show', 'No show open');
        }
        return this.current;
    }

    private requireSummary(): ShowSummary {
        const summary = this.summary();
        if (summary === null) {
            throw new EngineError('no-show', 'No show open');
        }
        return summary;
    }

    private notify(): void {
        this.listener(this.summary());
    }

    private notifyContent(part: ContentPart): void {
        for (const listener of this.contentListeners) {
            listener(part);
        }
    }
}
