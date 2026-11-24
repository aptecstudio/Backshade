/**
 * Open show: it is the only source of truth for the show data. It handles
 * creating, opening, saving, save as, closing and the periodic
 * recovery copy of unsaved changes.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { app } from 'electron';
import { SHOW_FOLDER_EXTENSION, type ShowDocument } from '../../shared/show/show-document';
import type { ShowPatch } from '../../shared/patch/patch';
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

/** Function called when the patch may have changed (show opened, closed, recovered or patch edited) */
export type PatchChangeListener = () => void;

export class ShowSession {
    private current: OpenShow | null = null;
    private readonly listener: ShowChangeListener;
    private autosaveTimer: NodeJS.Timeout | null = null;
    private readonly patchListeners: PatchChangeListener[] = [];

    constructor(listener: ShowChangeListener) {
        this.listener = listener;
    }

    /**
     * Registers a listener for the changes of the patch.
     */
    onPatchChange(listener: PatchChangeListener): void {
        this.patchListeners.push(listener);
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
            createdWith: app.getVersion()
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
        this.notifyPatch();

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
        this.notifyPatch();
    }

    /**
     * Loads the recovery copy in place of the saved data.
     */
    recover(): ShowSummary {
        const show = this.requireOpen();
        show.document = showFiles.readAutosave(show.folder);
        show.dirty = true;
        this.notify();
        this.notifyPatch();
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
        this.notifyPatch();
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

    private notifyPatch(): void {
        for (const listener of this.patchListeners) {
            listener();
        }
    }
}
