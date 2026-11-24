/**
 * List of the application sections, in navigation order.
 * Each section declares its text, an optional icon and the function
 * that creates its content, called only when the section is opened.
 */

import type { Component, IconName } from '../../framework/ts/index.js';
import type { TextKey } from '../i18n/i18n.js';
import { StartPage } from '../start/start-page.js';
import { MediaSection } from './media/media-section.js';
import { PatchSection } from './patch/patch-section.js';
import { PlaceholderSection } from './placeholder-section.js';
import { SettingsSection } from './settings/settings-section.js';

/** Identifier of a section */
export type SectionId = 'start' | 'console' | 'virtualConsole' | 'timeline' | 'patch' | 'media' | 'settings';

/** Section definition */
export interface SectionDefinition {
    id: SectionId;
    /** Text of the navigation key */
    labelKey: TextKey;
    /** If present, the key shows only the icon */
    icon?: IconName;
    /** Creates the content of the section */
    create(): Component;
}

/** Working sections of the show, shown as keys in the top bar */
export const MAIN_SECTIONS: readonly SectionDefinition[] = [
    { id: 'console', labelKey: 'sections.console', create: () => new PlaceholderSection('sections.console') },
    { id: 'virtualConsole', labelKey: 'sections.virtualConsole', create: () => new PlaceholderSection('sections.virtualConsole') },
    { id: 'timeline', labelKey: 'sections.timeline', create: () => new PlaceholderSection('sections.timeline') },
    { id: 'patch', labelKey: 'sections.patch', create: () => new PatchSection() },
    { id: 'media', labelKey: 'sections.media', create: () => new MediaSection() }
];

/** Start page with the recent shows */
export const START_SECTION: SectionDefinition = {
    id: 'start',
    labelKey: 'start.title',
    icon: 'house',
    create: () => new StartPage()
};

/** Settings section */
export const SETTINGS_SECTION: SectionDefinition = {
    id: 'settings',
    labelKey: 'sections.settings',
    icon: 'settings',
    create: () => new SettingsSection()
};

/** All the sections */
export const ALL_SECTIONS: readonly SectionDefinition[] = [START_SECTION, ...MAIN_SECTIONS, SETTINGS_SECTION];

/** Working section opened when the first show is opened */
export const DEFAULT_SECTION: SectionId = 'console';

/**
 * Tells whether a text is the identifier of a working section of the show.
 */
export function isMainSectionId(value: string | null): value is SectionId {
    return MAIN_SECTIONS.some((section) => section.id === value);
}
