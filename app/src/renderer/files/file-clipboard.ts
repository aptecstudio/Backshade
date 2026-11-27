/**
 * Files copied or cut in the file manager, waiting to be pasted. It is kept
 * for the whole session of the window, so it survives closing the manager.
 */

/** What paste does */
export type PasteMode = 'copy' | 'move';

let content: { mode: PasteMode; paths: string[] } | null = null;

export function clipboard(): { mode: PasteMode; paths: string[] } | null {
    return content;
}

export function setClipboard(next: { mode: PasteMode; paths: string[] } | null): void {
    content = next;
}
