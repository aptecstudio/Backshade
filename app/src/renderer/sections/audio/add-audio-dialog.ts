/**
 * Adds audio files of the show media to the playlist: one key per file,
 * pressed to choose it; files are added in the order chosen.
 */

import { Dialog, Key, Label, Stack } from '../../../framework/ts/index.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

export async function openAddAudio(): Promise<void> {
    let files: string[];
    try {
        files = (await engine().request('media.list')).filter((item) => item.kind === 'audio').map((item) => item.file);
    } catch (error) {
        await showError(error);
        return;
    }
    const dialog = new Dialog({ title: t('audio.addTitle'), size: 'wide' });
    const chosen: string[] = [];
    const keys = files.map((file) => {
        const key = new Key({ label: file, icon: 'music' });
        key.onPress(() => {
            const at = chosen.indexOf(file);
            if (at >= 0) {
                chosen.splice(at, 1);
            } else {
                chosen.push(file);
            }
            key.setArmed(at < 0);
            add.setDisabled(chosen.length === 0);
        });
        return key;
    });
    dialog.append(files.length === 0
        ? new Label({ text: t('audio.noFiles'), tone: 'secondary', size: 'small' })
        : new Stack({ direction: 'row', gap: 8, wrap: true, classes: ['audio-add__files'], children: keys }));
    const cancel = new Key({ label: t('common.cancel') });
    const add = new Key({ label: t('audio.add'), icon: 'plus', state: 'active' });
    add.setDisabled(true);
    cancel.onPress(() => dialog.close());
    add.onPress(() => void engine().request('audio.addItems', { files: [...chosen] }).then(() => dialog.close()).catch(showError));
    dialog.addActions(cancel, add);
    dialog.onCancel(() => dialog.close());
    dialog.open();
}
