/**
 * Struttura del file show.json, condivisa tra motore e interfaccia.
 * Le fasi successive aggiungono qui le proprie sezioni (patch, scene,
 * timeline); ogni cambio incompatibile aumenta SHOW_FORMAT_VERSION.
 */

import type { ShowSettings } from './show-settings.js';

/** Versione del formato di show.json */
export const SHOW_FORMAT_VERSION = 1;

/** Estensione della cartella di uno show */
export const SHOW_FOLDER_EXTENSION = '.backshade';

/** Contenuto di show.json */
export interface ShowDocument {
    /** Versione del formato del file */
    formatVersion: number;
    /** Identificativo univoco dello show */
    id: string;
    /** Nome dello show */
    name: string;
    /** Data di creazione, ISO 8601 */
    createdAt: string;
    /** Data dell'ultimo salvataggio, ISO 8601 */
    modifiedAt: string;
    /** Versione di Backshade che ha creato lo show */
    createdWith: string;
    /** Impostazioni dello show; mancanti nei file meno recenti, completate alla lettura */
    settings: ShowSettings;
}
