/**
 * Central area showing the content of the open section. When the section
 * changes the previous content is destroyed and the new one created. A
 * section the operator sees read only carries a notice above it, and its
 * editing controls (marked with markEdit) are inert and dimmed.
 */

import { Component, create, icon } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { ALL_SECTIONS, type SectionId } from '../sections/section-definitions.js';
import { EDIT_ATTRIBUTE } from '../show/edit-access.js';
import { onOperatorChange, sectionAccess } from '../show/operator-store.js';
import type { SectionNavigation } from './section-navigation.js';

export class SectionHost extends Component<HTMLElement> {
    private content: Component | null = null;
    private readonly notice: HTMLElement;
    private current: SectionId;

    constructor(navigation: SectionNavigation) {
        super(create('main', { classes: ['section-host'] }));

        this.notice = create('p', {
            classes: ['section-host__notice'],
            children: [icon('lock'), create('span', { text: t('operators.readOnly') })]
        });
        this.element.append(this.notice);
        this.current = navigation.section;
        this.show(navigation.section);
        this.track(navigation.onChange((section) => this.show(section)));
        this.track(onOperatorChange(() => this.renderNotice()));
        // Sections build their controls again when they change: new editing controls follow the access too
        const observer = new MutationObserver(() => this.applyAccess());
        observer.observe(this.element, { subtree: true, childList: true, attributes: true, attributeFilter: [EDIT_ATTRIBUTE] });
        this.track(() => observer.disconnect());
        this.track(() => this.content?.destroy());
    }

    /**
     * Replaces the content with that of the given section.
     */
    private show(id: SectionId): void {
        const definition = ALL_SECTIONS.find((section) => section.id === id);
        if (definition === undefined) {
            return;
        }
        this.current = id;
        this.renderNotice();
        this.content?.destroy();
        this.content = definition.create();
        this.content.mount(this.element);
        this.element.scrollTop = 0;
    }

    private renderNotice(): void {
        const readOnly = sectionAccess(this.current) === 'view';
        this.notice.hidden = !readOnly;
        this.element.classList.toggle('section-host--read-only', readOnly);
        this.applyAccess();
    }

    /** Editing controls are inert in a read-only section */
    private applyAccess(): void {
        const readOnly = this.element.classList.contains('section-host--read-only');
        for (const control of this.element.querySelectorAll<HTMLElement>(`[${EDIT_ATTRIBUTE}]`)) {
            if (control.inert !== readOnly) {
                control.inert = readOnly;
            }
        }
    }
}
