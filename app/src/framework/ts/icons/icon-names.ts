/**
 * File generato da scripts/build-icons.mts: non modificare a mano.
 * Elenco delle icone disponibili in assets/icons/lucide.
 */

export const ICON_NAMES = [
    'chevron-down',
    'circle',
    'file-plus',
    'folder-open',
    'folder-search',
    'headphones',
    'house',
    'image',
    'layout-template',
    'music',
    'package',
    'package-open',
    'pencil',
    'play',
    'plus',
    'repeat',
    'save',
    'settings',
    'skip-back',
    'square',
    'trash-2',
    'triangle-alert',
    'video',
    'x',
    'zap'
] as const;

/** Nome di un'icona disponibile */
export type IconName = typeof ICON_NAMES[number];
