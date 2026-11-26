/**
 * Navigation state: open section and change notifications.
 * The last open working section is remembered on this device and
 * reopened when a show is opened. Sections hidden to the operator are
 * never opened: the first shown section opens instead, or the start page,
 * and the requested section opens as soon as the operator can see it.
 */

import { Emitter, LocalPreference, type Unsubscribe } from '../../framework/ts/index.js';
import { DEFAULT_SECTION, isMainSectionId, type SectionId } from '../sections/section-definitions.js';
import { firstVisibleSection, followOperators, isSectionVisible, onOperatorChange } from '../show/operator-store.js';

export class SectionNavigation {
    private readonly preference = new LocalPreference('backshade.section');
    private readonly changes = new Emitter<SectionId>();
    private current: SectionId;
    // Section requested while hidden, opened when it becomes visible
    private wanted: SectionId | null = null;

    constructor(initial: SectionId) {
        this.current = initial;
        followOperators();
        onOperatorChange(() => {
            if (this.wanted !== null && isSectionVisible(this.wanted)) {
                this.show(this.wanted);
            } else if (!isSectionVisible(this.current)) {
                this.show(this.current);
            }
        });
    }

    /** Open section */
    get section(): SectionId {
        return this.current;
    }

    /**
     * Last working section opened on this device.
     */
    lastMainSection(): SectionId {
        const saved = this.preference.get();
        return isMainSectionId(saved) ? saved : DEFAULT_SECTION;
    }

    /**
     * Opens a section and notifies the change.
     */
    open(section: SectionId): void {
        this.wanted = null;
        this.show(section);
    }

    /**
     * Registers a listener for section changes.
     */
    onChange(listener: (section: SectionId) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    /**
     * Shows a section, or the first shown section when it is hidden.
     */
    private show(requested: SectionId): void {
        let section = requested;
        if (!isSectionVisible(requested)) {
            this.wanted = requested;
            section = firstVisibleSection() ?? 'start';
        } else if (requested === this.wanted) {
            this.wanted = null;
        }
        if (section === this.current) {
            return;
        }
        this.current = section;
        // A section opened in place of a hidden one is not remembered
        if (isMainSectionId(section) && this.wanted === null) {
            this.preference.set(section);
        }
        this.changes.emit(section);
    }
}
