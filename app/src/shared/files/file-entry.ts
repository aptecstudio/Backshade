/**
 * Files shown by the internal file manager: the places it can browse (home
 * and external drives) and the entries of a folder, with their kind
 * recognized by the name.
 */

import { mediaKindOf, type MediaKind } from '../show/media-kinds.js';

/** Place where browsing starts */
export interface FileRoot {
    path: string;
    name: string;
    kind: 'home' | 'drive' | 'show';
}

/** Kind of an entry */
export type FileKind = MediaKind | 'folder' | 'show' | 'showArchive' | 'templateArchive' | 'document' | 'other';

/** File or folder */
export interface FileEntry {
    name: string;
    path: string;
    kind: FileKind;
    /** Size in bytes, 0 for folders */
    size: number;
    /** Last change, ISO 8601 */
    modifiedAt: string;
}

/** Content of a folder */
export interface FolderContent {
    path: string;
    /** Folder above, null at the top of a root */
    parent: string | null;
    entries: FileEntry[];
}

/** Extensions of the Backshade files (see archive, show and fixture formats) */
export const SHOW_FOLDER_SUFFIX = '.backshade';
export const SHOW_ARCHIVE_SUFFIX = '.bshow';
export const TEMPLATE_ARCHIVE_SUFFIX = '.btemplate';

const DOCUMENT_SUFFIXES = ['.txt', '.md', '.pdf', '.json', '.csv', '.doc', '.docx', '.odt'];

/**
 * Kind of an entry from its name.
 * @param folder - The entry is a folder
 */
export function fileKindOf(name: string, folder: boolean): FileKind {
    const lower = name.toLowerCase();
    if (folder) {
        return lower.endsWith(SHOW_FOLDER_SUFFIX) ? 'show' : 'folder';
    }
    if (lower.endsWith(SHOW_ARCHIVE_SUFFIX)) {
        return 'showArchive';
    }
    if (lower.endsWith(TEMPLATE_ARCHIVE_SUFFIX)) {
        return 'templateArchive';
    }
    return mediaKindOf(lower) ?? (DOCUMENT_SUFFIXES.some((suffix) => lower.endsWith(suffix)) ? 'document' : 'other');
}
