/**
 * Stato della navigazione: sezione aperta e notifica dei cambi.
 * L'ultima sezione aperta è ricordata su questo dispositivo.
 */

import { Emitter, LocalPreference, type Unsubscribe } from '../../framework/ts/index.js';
import { DEFAULT_SECTION, isSectionId, type SectionId } from '../sections/section-definitions.js';

export class SectionNavigation {
    private readonly preference = new LocalPreference('backshade.section');
    private readonly changes = new Emitter<SectionId>();
    private current: SectionId;

    constructor() {
        const saved = this.preference.get();
        this.current = isSectionId(saved) ? saved : DEFAULT_SECTION;
    }

    /** Sezione aperta */
    get section(): SectionId {
        return this.current;
    }

    /**
     * Apre una sezione e notifica il cambio.
     */
    open(section: SectionId): void {
        if (section === this.current) {
            return;
        }
        this.current = section;
        this.preference.set(section);
        this.changes.emit(section);
    }

    /**
     * Registra un listener per i cambi di sezione.
     */
    onChange(listener: (section: SectionId) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
