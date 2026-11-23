/**
 * Media types handled by a show, recognized by the file extension.
 */

/** Media type */
export type MediaKind = 'audio' | 'video' | 'image';

/** Allowed extensions for each type, lowercase and without the dot */
export const MEDIA_EXTENSIONS: Readonly<Record<MediaKind, readonly string[]>> = {
    audio: ['wav', 'mp3', 'aif', 'aiff', 'flac', 'ogg', 'm4a'],
    video: ['mp4', 'mov', 'm4v', 'webm', 'mkv'],
    image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']
};

/**
 * Returns the media type of a file name, or null if it is not allowed.
 */
export function mediaKindOf(fileName: string): MediaKind | null {
    const dot = fileName.lastIndexOf('.');
    if (dot < 0) {
        return null;
    }
    const extension = fileName.slice(dot + 1).toLowerCase();
    for (const kind of Object.keys(MEDIA_EXTENSIONS) as MediaKind[]) {
        if (MEDIA_EXTENSIONS[kind].includes(extension)) {
            return kind;
        }
    }
    return null;
}
