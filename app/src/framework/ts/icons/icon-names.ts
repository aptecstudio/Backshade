/**
 * File generato da scripts/build-icons.mts: non modificare a mano.
 * Elenco delle icone disponibili in assets/icons/lucide.
 */

export const ICON_NAMES = [
    'chevron-down',
    'circle',
    'headphones',
    'play',
    'plus',
    'repeat',
    'settings',
    'skip-back',
    'square',
    'zap'
] as const;

/** Nome di un'icona disponibile */
export type IconName = typeof ICON_NAMES[number];
