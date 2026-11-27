/**
 * Editing controls of the working sections. A control that changes the show
 * (add, change, delete, record, move in a list) is marked as an editing
 * control; when the operator sees the section read only, the section host
 * makes the marked controls inert and dimmed, while the controls that play
 * the show stay usable. Drags and keyboard shortcuts that change the show
 * ask canEdit.
 */

import type { Component } from '../../framework/ts/index.js';
import type { SectionId } from '../sections/section-definitions.js';
import { sectionAccess } from './operator-store.js';

/** Attribute of the editing controls */
export const EDIT_ATTRIBUTE = 'data-edit';

/**
 * Marks components or elements as editing controls.
 */
export function markEdit(...items: Array<Component | HTMLElement>): void {
    for (const item of items) {
        const element = item instanceof HTMLElement ? item : item.element;
        element.setAttribute(EDIT_ATTRIBUTE, '');
    }
}

/** The operator may change the section */
export function canEdit(section: SectionId): boolean {
    return sectionAccess(section) === 'edit';
}
