/**
 * Navigation keys between sections: the key of the open section is active.
 */

import { Key, Stack } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import type { SectionDefinition, SectionId } from '../sections/section-definitions.js';
import type { SectionNavigation } from './section-navigation.js';

export class SectionTabs extends Stack {
    private readonly keys = new Map<SectionId, Key>();

    constructor(sections: readonly SectionDefinition[], navigation: SectionNavigation, label?: string) {
        super({ direction: 'row', gap: 1, classes: ['section-tabs'] });
        this.element.setAttribute('role', 'navigation');
        if (label !== undefined) {
            this.element.setAttribute('aria-label', label);
        }

        for (const section of sections) {
            const key = new Key({ label: t(section.labelKey), icon: section.icon, iconOnly: section.icon !== undefined });
            key.onPress(() => navigation.open(section.id));
            this.keys.set(section.id, key);
            this.append(key);
        }

        this.highlight(navigation.section);
        this.track(navigation.onChange((section) => this.highlight(section)));
    }

    /**
     * Enables or disables all the keys, for example when no show is open.
     */
    setDisabled(disabled: boolean): void {
        for (const key of this.keys.values()) {
            key.setDisabled(disabled);
        }
    }

    /**
     * Makes the key of the open section active.
     */
    private highlight(active: SectionId): void {
        for (const [id, key] of this.keys) {
            key.setState(id === active ? 'active' : 'normal');
        }
    }
}
