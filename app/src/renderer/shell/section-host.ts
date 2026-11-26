/**
 * Central area showing the content of the open section. When the section
 * changes the previous content is destroyed and the new one created. A
 * section the operator sees read only carries a notice above it.
 */

import { Component, create, icon } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { ALL_SECTIONS, type SectionId } from '../sections/section-definitions.js';
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
    }
}
