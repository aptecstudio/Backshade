/**
 * Keyboard shortcuts in the form "mod+s" or "mod+shift+s", where mod is
 * Cmd on macOS and Ctrl on the other systems.
 */

import { on, type Unsubscribe } from '../dom/events.js';

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);

interface ParsedShortcut {
    key: string;
    mod: boolean;
    shift: boolean;
    alt: boolean;
}

function parse(shortcut: string): ParsedShortcut {
    const parts = shortcut.toLowerCase().split('+');
    return {
        key: parts[parts.length - 1],
        mod: parts.includes('mod'),
        shift: parts.includes('shift'),
        alt: parts.includes('alt')
    };
}

function matches(event: KeyboardEvent, shortcut: ParsedShortcut): boolean {
    const mod = IS_MAC ? event.metaKey : event.ctrlKey;
    return event.key.toLowerCase() === shortcut.key
        && mod === shortcut.mod
        && event.shiftKey === shortcut.shift
        && event.altKey === shortcut.alt;
}

/**
 * Registers a shortcut on the document; returns the function that removes it.
 */
export function onShortcut(shortcut: string, handler: (event: KeyboardEvent) => void): Unsubscribe {
    const parsed = parse(shortcut);
    return on(document, 'keydown', (event) => {
        if (matches(event, parsed)) {
            event.preventDefault();
            handler(event);
        }
    });
}
