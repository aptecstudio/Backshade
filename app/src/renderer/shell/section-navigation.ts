/**
 * Stato della navigazione: sezione aperta e notifica dei cambi.
 * L'ultima sezione di lavoro aperta è ricordata su questo dispositivo e
 * viene riaperta quando si apre uno show.
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

    /** Sezione aperta */
    get section(): SectionId {
        return this.current;
    }

    /**
     * Ultima sezione di lavoro aperta su questo dispositivo.
     */
    lastMainSection(): SectionId {
        const saved = this.preference.get();
        return isMainSectionId(saved) ? saved : DEFAULT_SECTION;
    }

    /**
     * Apre una sezione e notifica il cambio.
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
     * Registra un listener per i cambi di sezione.
     */
    onChange(listener: (section: SectionId) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
