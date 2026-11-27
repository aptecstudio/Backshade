/**
 * Opens the dialog of a patch row: the fixture, or the matrix of a matrix part.
 * A read-only operator sees the rows without opening them.
 */

import { canEdit } from '../../show/edit-access.js';
import { openEditFixture } from './edit-fixture-dialog.js';
import { openMatrixDialog } from './matrix-dialog.js';
import type { PatchRow } from './patch-rows.js';

/**
 * Opens the dialog of a row.
 * @param rows - All the rows of the patch
 */
export function openRow(row: PatchRow, rows: readonly PatchRow[]): void {
    if (!canEdit('patch')) {
        return;
    }
    if (row.matrix !== undefined) {
        openMatrixDialog(row.matrix, rows);
    } else {
        void openEditFixture(row);
    }
}
