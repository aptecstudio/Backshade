/**
 * Files of the device of a remote client. Choosing them is the one place
 * where the system file window is used (decided by the human): only it can
 * reach the files of that device.
 */

import { create } from '../../framework/ts/index.js';
import { MEDIA_EXTENSIONS } from '../../shared/show/media-kinds.js';

/** Media files, as accepted by a file field */
export const MEDIA_ACCEPT = Object.values(MEDIA_EXTENSIONS).flat().map((extension) => `.${extension}`).join(',');

/** Media, show and template archives and fixture definitions */
export const ANY_ACCEPT = `${MEDIA_ACCEPT},.bshow,.btemplate,.json`;

/** Asks the files to send; empty when cancelled */
export function pickDeviceFiles(accept: string): Promise<File[]> {
    return new Promise((resolve) => {
        const input = create('input', { attributes: { type: 'file', accept, multiple: 'multiple' } });
        const finish = (files: File[]): void => {
            input.remove();
            resolve(files);
        };
        input.addEventListener('change', () => finish([...input.files ?? []]));
        input.addEventListener('cancel', () => finish([]));
        // In the page while the window is open: some browsers drop a detached field
        input.hidden = true;
        document.body.append(input);
        input.click();
    });
}
