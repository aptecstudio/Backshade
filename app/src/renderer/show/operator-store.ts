/**
 * Operator of the open show on the interface side: who entered and which
 * working sections the profile shows, read only or editable. Until an
 * operator entered (also while a show without operators waits for its
 * administrator) no working section is shown.
 */

import { Emitter, type Unsubscribe } from '../../framework/ts/index.js';
import { effectiveAccess, type OperatorSection, type OperatorState, type SectionAccess } from '../../shared/show/operators.js';
import { MAIN_SECTIONS, type SectionId } from '../sections/section-definitions.js';
import { engine } from '../transport/engine.js';
import { currentShow, onShowChange } from './show-store.js';

let state: OperatorState = { showId: null, required: false, operator: null };
const changes = new Emitter<void>();
let started = false;

function apply(next: OperatorState): void {
    state = next;
    changes.emit();
}

/**
 * Starts following the operator state; called once by the shell.
 */
export function followOperators(): void {
    if (started) {
        return;
    }
    started = true;
    engine().on('operators.changed', ({ state: next }) => apply(next));
    onShowChange(() => changes.emit());
    void engine().request('operators.getState').then(apply).catch(() => undefined);
}

/** Operator state as last told by the engine */
export function operatorState(): OperatorState {
    return state;
}

/** The open show waits for an operator to enter */
export function isLocked(): boolean {
    const show = currentShow();
    return show !== null && (state.showId !== show.id || state.operator === null);
}

/** Access of the operator to a working section; settings and start page are always editable */
export function sectionAccess(id: SectionId): SectionAccess {
    if (!MAIN_SECTIONS.some((section) => section.id === id)) {
        return 'edit';
    }
    if (isLocked()) {
        return 'hidden';
    }
    // Without a show there are no operators
    return state.operator === null ? 'edit' : effectiveAccess(state.operator)[id as OperatorSection];
}

/** The working section is shown to the operator */
export function isSectionVisible(id: SectionId): boolean {
    return sectionAccess(id) !== 'hidden';
}

/** First working section shown, null when none is shown */
export function firstVisibleSection(): SectionId | null {
    return MAIN_SECTIONS.find((section) => isSectionVisible(section.id))?.id ?? null;
}

/** The operator may change the settings of the show: an administrator */
export function canManageShow(): boolean {
    return !isLocked() && (currentShow() === null || state.operator?.admin === true);
}

/** Registers a listener for the changes of the operator or of the open show */
export function onOperatorChange(listener: () => void): Unsubscribe {
    return changes.subscribe(listener);
}
