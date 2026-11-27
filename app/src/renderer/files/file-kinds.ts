/**
 * Icon and name of every kind of file of the file manager.
 */

import type { IconName } from '../../framework/ts/index.js';
import type { FileKind } from '../../shared/files/file-entry.js';
import type { TextKey } from '../i18n/i18n.js';

export const KIND_ICONS: Readonly<Record<FileKind, IconName>> = {
    folder: 'folder',
    show: 'clapperboard',
    audio: 'music',
    video: 'film',
    image: 'image',
    showArchive: 'package',
    templateArchive: 'package',
    document: 'file-text',
    other: 'file'
};

export const KIND_LABELS: Readonly<Record<FileKind, TextKey>> = {
    folder: 'files.kinds.folder',
    show: 'files.kinds.show',
    audio: 'files.kinds.audio',
    video: 'files.kinds.video',
    image: 'files.kinds.image',
    showArchive: 'files.kinds.showArchive',
    templateArchive: 'files.kinds.templateArchive',
    document: 'files.kinds.document',
    other: 'files.kinds.other'
};
