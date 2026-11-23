/**
 * Elenco delle sezioni dell'applicazione, nell'ordine della navigazione.
 * Ogni sezione dichiara il proprio testo, un'icona opzionale e la funzione
 * che ne crea il contenuto, chiamata solo quando la sezione viene aperta.
 */

import type { Component, IconName } from '../../framework/ts/index.js';
import type { TextKey } from '../i18n/i18n.js';
import { PlaceholderSection } from './placeholder-section.js';
import { SettingsSection } from './settings/settings-section.js';

/** Identificativo di una sezione */
export type SectionId = 'console' | 'virtualConsole' | 'timeline' | 'patch' | 'media' | 'settings';

/** Definizione di una sezione */
export interface SectionDefinition {
    id: SectionId;
    /** Testo del tasto di navigazione */
    labelKey: TextKey;
    /** Se presente, il tasto mostra solo l'icona */
    icon?: IconName;
    /** Crea il contenuto della sezione */
    create(): Component;
}

/** Sezioni principali, mostrate come tasti nella barra in alto */
export const MAIN_SECTIONS: readonly SectionDefinition[] = [
    { id: 'console', labelKey: 'sections.console', create: () => new PlaceholderSection('sections.console') },
    { id: 'virtualConsole', labelKey: 'sections.virtualConsole', create: () => new PlaceholderSection('sections.virtualConsole') },
    { id: 'timeline', labelKey: 'sections.timeline', create: () => new PlaceholderSection('sections.timeline') },
    { id: 'patch', labelKey: 'sections.patch', create: () => new PlaceholderSection('sections.patch') },
    { id: 'media', labelKey: 'sections.media', create: () => new PlaceholderSection('sections.media') }
];

/** Sezione delle impostazioni, mostrata come tasto con icona */
export const SETTINGS_SECTION: SectionDefinition = {
    id: 'settings',
    labelKey: 'sections.settings',
    icon: 'settings',
    create: () => new SettingsSection()
};

/** Tutte le sezioni */
export const ALL_SECTIONS: readonly SectionDefinition[] = [...MAIN_SECTIONS, SETTINGS_SECTION];

/** Sezione aperta al primo avvio */
export const DEFAULT_SECTION: SectionId = 'console';

/**
 * Indica se un testo è l'identificativo di una sezione esistente.
 */
export function isSectionId(value: string | null): value is SectionId {
    return ALL_SECTIONS.some((section) => section.id === value);
}
