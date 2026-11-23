/**
 * Elenco delle sezioni dell'applicazione, nell'ordine della navigazione.
 * Ogni sezione dichiara il proprio testo, un'icona opzionale e la funzione
 * che ne crea il contenuto, chiamata solo quando la sezione viene aperta.
 */

import type { Component, IconName } from '../../framework/ts/index.js';
import type { TextKey } from '../i18n/i18n.js';
import { StartPage } from '../start/start-page.js';
import { MediaSection } from './media/media-section.js';
import { PlaceholderSection } from './placeholder-section.js';
import { SettingsSection } from './settings/settings-section.js';

/** Identificativo di una sezione */
export type SectionId = 'start' | 'console' | 'virtualConsole' | 'timeline' | 'patch' | 'media' | 'settings';

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

/** Sezioni di lavoro sullo show, mostrate come tasti nella barra in alto */
export const MAIN_SECTIONS: readonly SectionDefinition[] = [
    { id: 'console', labelKey: 'sections.console', create: () => new PlaceholderSection('sections.console') },
    { id: 'virtualConsole', labelKey: 'sections.virtualConsole', create: () => new PlaceholderSection('sections.virtualConsole') },
    { id: 'timeline', labelKey: 'sections.timeline', create: () => new PlaceholderSection('sections.timeline') },
    { id: 'patch', labelKey: 'sections.patch', create: () => new PlaceholderSection('sections.patch') },
    { id: 'media', labelKey: 'sections.media', create: () => new MediaSection() }
];

/** Schermata iniziale con gli show recenti */
export const START_SECTION: SectionDefinition = {
    id: 'start',
    labelKey: 'start.title',
    icon: 'house',
    create: () => new StartPage()
};

/** Sezione delle impostazioni */
export const SETTINGS_SECTION: SectionDefinition = {
    id: 'settings',
    labelKey: 'sections.settings',
    icon: 'settings',
    create: () => new SettingsSection()
};

/** Tutte le sezioni */
export const ALL_SECTIONS: readonly SectionDefinition[] = [START_SECTION, ...MAIN_SECTIONS, SETTINGS_SECTION];

/** Sezione di lavoro aperta quando si apre il primo show */
export const DEFAULT_SECTION: SectionId = 'console';

/**
 * Indica se un testo è l'identificativo di una sezione di lavoro sullo show.
 */
export function isMainSectionId(value: string | null): value is SectionId {
    return MAIN_SECTIONS.some((section) => section.id === value);
}
