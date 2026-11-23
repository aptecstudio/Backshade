/**
 * Central area showing the content of the open section. When the section
 * changes the previous content is destroyed and the new one created.
 */

import { Component, create } from '../../framework/ts/index.js';
import { ALL_SECTIONS, type SectionId } from '../sections/section-definitions.js';
import type { SectionNavigation } from './section-navigation.js';

export class SectionHost extends Component<HTMLElement> {
    private content: Component | null = null;

    constructor(navigation: SectionNavigation) {
        super(create('main', { classes: ['section-host'] }));

        this.show(navigation.section);
        this.track(navigation.onChange((section) => this.show(section)));
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
        this.content?.destroy();
        this.content = definition.create();
        this.content.mount(this.element);
        this.element.scrollTop = 0;
    }
}
