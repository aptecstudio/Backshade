/**
 * Structure of the show.json file, shared between engine and interface.
 * The next phases add their own sections here (patch, scenes,
 * timeline); every incompatible change increases SHOW_FORMAT_VERSION.
 */

import type { ShowAudio } from '../audio/audio.js';
import type { ShowMemories } from '../console/memories.js';
import type { ShowGrid } from '../grid/grid.js';
import type { ShowTimelines } from '../timeline/timeline.js';
import type { ShowVideo } from '../video/video.js';
import type { ShowOutput } from '../output/output-config.js';
import type { ShowPatch } from '../patch/patch.js';
import type { ShowSettings } from './show-settings.js';

/** Format version of show.json */
export const SHOW_FORMAT_VERSION = 1;

/** Extension of a show folder */
export const SHOW_FOLDER_EXTENSION = '.backshade';

/** Content of show.json */
export interface ShowDocument {
    /** Format version of the file */
    formatVersion: number;
    /** Unique identifier of the show */
    id: string;
    /** Show name */
    name: string;
    /** Creation date, ISO 8601 */
    createdAt: string;
    /** Date of the last save, ISO 8601 */
    modifiedAt: string;
    /** Backshade version that created the show */
    createdWith: string;
    /** Show settings; missing in older files, completed when reading */
    settings: ShowSettings;
    /** Fixtures placed on the DMX universes; missing in older files, completed when reading */
    patch: ShowPatch;
    /** Frame rate and Art-Net destinations of the universes; missing in older files, completed when reading */
    output: ShowOutput;
    /** Scenes and chasers of the simple console; missing in older files, completed when reading */
    memories: ShowMemories;
    /** Pages of the virtual console; missing in older files, completed when reading */
    grid: ShowGrid;
    /** Audio player and playlist; missing in older files, completed when reading */
    audio: ShowAudio;
    /** Video outputs; missing in older files, completed when reading */
    video: ShowVideo;
    /** Timelines of tracks; missing in older files, completed when reading */
    timelines: ShowTimelines;
}
