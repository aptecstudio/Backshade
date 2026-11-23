/**
 * Show aperto: è l'unica fonte di verità sui dati dello show. Gestisce
 * creazione, apertura, salvataggio, salva come, chiusura e la copia di
 * recupero periodica delle modifiche non salvate.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { app } from 'electron';
import { SHOW_FOLDER_EXTENSION, type ShowDocument } from '../../shared/show/show-document';
import type { OpenShowResult, ShowSummary } from '../../shared/transport/engine-api';
import { copyFolder } from '../storage/copy-folder';
import { toFileName, uniquePath } from '../storage/file-names';
import { EngineError } from '../transport/engine-error';
import * as showFiles from './show-files';

// Intervallo della copia di recupero
const AUTOSAVE_INTERVAL_MS = 2 * 60 * 1000;

interface OpenShow {
    folder: string;
    document: ShowDocument;
    dirty: boolean;
}

/** Funzione chiamata a ogni cambio dello show aperto */
export type ShowChangeListener = (show: ShowSummary | null) => void;

export class ShowSession {
    private current: OpenShow | null = null;
    private readonly listener: ShowChangeListener;
    private autosaveTimer: NodeJS.Timeout | null = null;

    constructor(listener: ShowChangeListener) {
        this.listener = listener;
    }

    /** Show aperto, o null */
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

    /** Ci sono modifiche non salvate */
    get dirty(): boolean {
        return this.current?.dirty === true;
    }

    /**
     * Crea uno show copiando un modello e lo apre.
     * @param templateFolder - Cartella del modello
     * @param exclude - Elementi del modello da non copiare (ad esempio template.json)
     */
    create(name: string, parentFolder: string, templateFolder: string, exclude: readonly string[]): OpenShowResult {
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
     * Apre lo show di una cartella.
     */
    open(folder: string): OpenShowResult {
        this.requireClosedOrSaved();
        const document = showFiles.readShow(folder);
        const recoveryAvailable = showFiles.hasNewerAutosave(folder);

        this.closeQuietly();
        this.current = { folder, document, dirty: false };
        this.startAutosave();
        this.notify();

        return { show: this.requireSummary(), recoveryAvailable };
    }

    /**
     * Salva lo show aperto.
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
     * Salva lo show aperto come nuovo show, con nuovo nome e identificativo,
     * e apre la copia.
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
     * Rinomina lo show aperto; la modifica va salvata.
     */
    rename(name: string): ShowSummary {
        const show = this.requireOpen();
        const trimmed = name.trim();
        if (trimmed === '') {
            throw new EngineError('invalid-name', 'Nome vuoto');
        }
        show.document = { ...show.document, name: trimmed };
        show.dirty = true;
        this.notify();
        return this.requireSummary();
    }

    /**
     * Carica la copia di recupero al posto dei dati salvati.
     */
    recover(): ShowSummary {
        const show = this.requireOpen();
        show.document = showFiles.readAutosave(show.folder);
        show.dirty = true;
        this.notify();
        return this.requireSummary();
    }

    /**
     * Elimina la copia di recupero.
     */
    discardRecovery(): void {
        showFiles.removeAutosave(this.requireOpen().folder);
    }

    /**
     * Chiude lo show. Con modifiche non salvate serve discard, altrimenti errore.
     */
    close(discard: boolean): void {
        if (this.current === null) {
            return;
        }
        if (this.current.dirty && !discard) {
            throw new EngineError('unsaved-changes', 'Lo show ha modifiche non salvate');
        }
        showFiles.removeAutosave(this.current.folder);
        this.closeQuietly();
        this.notify();
    }

    /**
     * Ferma la copia di recupero, ad esempio all'uscita dall'applicazione.
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
     * Scrive la copia di recupero se ci sono modifiche non salvate.
     */
    autosave(): void {
        if (this.current === null || !this.current.dirty) {
            return;
        }
        try {
            showFiles.writeAutosave(this.current.folder, this.current.document);
        } catch (error) {
            console.error('Copia di recupero non riuscita', error);
        }
    }

    /**
     * Impedisce di sostituire uno show con modifiche non salvate.
     */
    private requireClosedOrSaved(): void {
        if (this.current?.dirty === true) {
            throw new EngineError('unsaved-changes', 'Lo show aperto ha modifiche non salvate');
        }
    }

    private requireOpen(): OpenShow {
        if (this.current === null) {
            throw new EngineError('no-show', 'Nessuno show aperto');
        }
        return this.current;
    }

    private requireSummary(): ShowSummary {
        const summary = this.summary();
        if (summary === null) {
            throw new EngineError('no-show', 'Nessuno show aperto');
        }
        return summary;
    }

    private notify(): void {
        this.listener(this.summary());
    }
}
