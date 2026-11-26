/**
 * Tabs of the working sections of the show (console, grid, timeline,
 * patch, media), shown in the status bar. The tab of the open section is
 * active; without an open show the tabs are disabled.
 */

import { TabBar } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { isMainSectionId, MAIN_SECTIONS, type SectionId } from '../sections/section-definitions.js';
import { isSectionVisible, onOperatorChange } from '../show/operator-store.js';
import type { SectionNavigation } from './section-navigation.js';

export class SectionTabBar extends TabBar<SectionId> {
    constructor(navigation: SectionNavigation) {
        super({
            tabs: MAIN_SECTIONS.map((section) => ({ value: section.id, label: t(section.labelKey) })),
            value: isMainSectionId(navigation.section) ? navigation.section : null,
            label: t('shell.navigation')
        });
        this.onChange((section) => navigation.open(section));
        this.track(navigation.onChange((section) => this.setValue(isMainSectionId(section) ? section : null)));
        // Sections hidden to the operator have no tab
        const showTabs = (): void => MAIN_SECTIONS.forEach((section) => this.setHidden(section.id, !isSectionVisible(section.id)));
        this.track(onOperatorChange(showTabs));
        showTabs();
    }
}
