/**
 * Navigation state: open section and change notifications.
 * The last open working section is remembered on this device and
 * reopened when a show is opened.
 */

import { Emitter, LocalPreference, type Unsubscribe } from '../../framework/ts/index.js';
import { DEFAULT_SECTION, isMainSectionId, type SectionId } from '../sections/section-definitions.js';

export class SectionNavigation {
    private readonly preference = new LocalPreference('backshade.section');
    private readonly changes = new Emitter<SectionId>();
    private current: SectionId;

    constructor(initial: SectionId) {
        this.current = initial;
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
        if (section === this.current) {
            return;
        }
        this.current = section;
        if (isMainSectionId(section)) {
            this.preference.set(section);
        }
        this.changes.emit(section);
    }

    /**
     * Registers a listener for section changes.
     */
    onChange(listener: (section: SectionId) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
