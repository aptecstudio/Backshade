/**
 * Contract between interface and engine: methods the interface can call
 * and events the engine can send, with their data types.
 * The engine checks the parameters of every method, because requests
 * can come from remote clients.
 */

import type { MediaKind } from '../show/media-kinds.js';
import type { ShowSettings } from '../show/show-settings.js';

/** Information about the application, for the About window */
export interface AppInfo {
    name: string;
    version: string;
    license: string;
    electron: string;
    chrome: string;
    node: string;
    platform: string;
    arch: string;
}

/** Text in one language or translated in several languages (language code -> text) */
export type LocalizedText = string | Record<string, string>;

/** Open show */
export interface ShowSummary {
    id: string;
    name: string;
    /** Show folder */
    folder: string;
    /** Date of the last save, ISO 8601 */
    modifiedAt: string;
    /** There are unsaved changes */
    dirty: boolean;
}

/** Result of opening a show */
export interface OpenShowResult {
    show: ShowSummary;
    /** There is a recovery copy newer than the last save */
    recoveryAvailable: boolean;
}

/** Recent show */
export interface RecentShow {
    name: string;
    folder: string;
    /** Date of the last opening, ISO 8601 */
    openedAt: string;
    /** Date of the last save, ISO 8601, if the show still exists */
    modifiedAt: string | null;
    /** The show is no longer in its folder (moved or deleted) */
    missing: boolean;
}

/** Show template */
export interface TemplateInfo {
    /** Identifier, for example "bundled:empty" or "user:Small stage" */
    id: string;
    name: LocalizedText;
    description: LocalizedText;
    /** Included in the application (read-only) or created by the user */
    source: 'bundled' | 'user';
}

/** Media of a show */
export interface MediaItem {
    /** Path relative to the media/ folder, with "/" as separator */
    file: string;
    /** File name */
    name: string;
    kind: MediaKind;
    /** Size in bytes */
    size: number;
    /** Date of the last change of the file, ISO 8601 */
    modifiedAt: string;
}

/** Global application settings */
export interface AppSettings {
    /** Default folder of new shows */
    defaultShowsFolder: string;
}

/** Engine methods: parameters and result */
export interface EngineMethods {
    /** Information about the application */
    'app.getInfo': { params: undefined; result: AppInfo };
    /** Closes the main window after the confirmation of the user */
    'app.confirmClose': { params: undefined; result: undefined };
    /** Opens the About window (desktop application only) */
    'window.openAbout': { params: undefined; result: undefined };
    /** Lets the user choose a folder (desktop application only) */
    'dialog.chooseFolder': { params: { defaultPath?: string }; result: string | null };

    /** Open show, or null */
    'show.getCurrent': { params: undefined; result: ShowSummary | null };
    /** Creates a show from a template and opens it */
    'show.create': { params: { name: string; folder: string; templateId: string }; result: OpenShowResult };
    /** Opens the show of a folder */
    'show.open': { params: { folder: string }; result: OpenShowResult };
    /** Lets the user choose the folder of a show and opens it; null if cancelled */
    'show.chooseAndOpen': { params: undefined; result: OpenShowResult | null };
    /** Saves the open show */
    'show.save': { params: undefined; result: ShowSummary };
    /** Saves the open show with a new name in a folder */
    'show.saveAs': { params: { name: string; folder: string }; result: ShowSummary };
    /** Renames the open show (unsaved change) */
    'show.rename': { params: { name: string }; result: ShowSummary };
    /** Loads the recovery copy of the open show */
    'show.recover': { params: undefined; result: ShowSummary };
    /** Deletes the recovery copy of the open show */
    'show.discardRecovery': { params: undefined; result: undefined };
    /** Closes the show; with discard true the unsaved changes are discarded */
    'show.close': { params: { discard?: boolean }; result: undefined };

    /** Exports the open, saved show to a .bshow archive; returns the file, or null if cancelled */
    'show.export': { params: undefined; result: string | null };
    /** Imports a show from a .bshow archive into the default folder and opens it; null if cancelled */
    'show.import': { params: undefined; result: OpenShowResult | null };

    /** Settings of the open show */
    'show.getSettings': { params: undefined; result: ShowSettings };
    /** Changes the settings of the open show (unsaved change) */
    'show.updateSettings': { params: Partial<ShowSettings>; result: ShowSettings };

    /** Media of the open show */
    'media.list': { params: undefined; result: MediaItem[] };
    /** Lets the user choose files and copies them into the show media (desktop application only) */
    'media.import': { params: undefined; result: MediaItem[] };
    /** Deletes a media file from the show */
    'media.remove': { params: { file: string }; result: undefined };
    /** Shows a media file in the system folder (desktop application only) */
    'media.reveal': { params: { file: string }; result: undefined };

    /** Recent shows, most recent first */
    'recent.list': { params: undefined; result: RecentShow[] };
    /** Removes a show from the recent shows */
    'recent.remove': { params: { folder: string }; result: undefined };

    /** Available templates: included and from the user */
    'template.list': { params: undefined; result: TemplateInfo[] };
    /** Saves the open show as a user template */
    'template.saveCurrent': { params: { name: string; description: string }; result: TemplateInfo };
    /** Changes the name and description of a user template */
    'template.update': { params: { id: string; name: string; description: string }; result: TemplateInfo };
    /** Deletes a user template */
    'template.delete': { params: { id: string }; result: undefined };
    /** Exports a template to a .btemplate archive; returns the file, or null if cancelled */
    'template.export': { params: { id: string }; result: string | null };
    /** Imports a template from a .btemplate archive; null if cancelled */
    'template.import': { params: undefined; result: TemplateInfo | null };

    /** Global settings */
    'settings.get': { params: undefined; result: AppSettings };
    /** Changes the global settings */
    'settings.update': { params: Partial<AppSettings>; result: AppSettings };
}

/** Engine events and their data */
export interface EngineEvents {
    /** The list of available languages has changed (pack added or removed) */
    'locales.changed': { codes: string[] };
    /** The open show has changed (opened, saved, modified, closed) */
    'show.changed': { show: ShowSummary | null };
    /** The media of the open show have changed */
    'media.changed': Record<string, never>;
    /** The list of recent shows has changed */
    'recent.changed': Record<string, never>;
    /** The list of templates has changed */
    'templates.changed': Record<string, never>;
    /** The user wants to close the window with unsaved changes */
    'app.closeRequested': Record<string, never>;
}

/** Name of an engine method */
export type EngineMethod = keyof EngineMethods;

/** Name of an engine event */
export type EngineEvent = keyof EngineEvents;
