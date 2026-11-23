/**
 * Tipi di media gestiti da uno show, riconosciuti dall'estensione del file.
 */

/** Tipo di media */
export type MediaKind = 'audio' | 'video' | 'image';

/** Estensioni ammesse per ogni tipo, in minuscolo e senza punto */
export const MEDIA_EXTENSIONS: Readonly<Record<MediaKind, readonly string[]>> = {
    audio: ['wav', 'mp3', 'aif', 'aiff', 'flac', 'ogg', 'm4a'],
    video: ['mp4', 'mov', 'm4v', 'webm', 'mkv'],
    image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']
};

/**
 * Restituisce il tipo di media di un nome di file, o null se non è ammesso.
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
