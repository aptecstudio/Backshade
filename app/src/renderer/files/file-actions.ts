/**
 * Questions of the file manager: a name for a folder or a rename, and the
 * confirmation before deleting for good.
 */

import { askChoice } from '../dialogs/ask-choice.js';
import { askText } from '../dialogs/ask-text.js';
import { t } from '../i18n/i18n.js';

/** Asks a file or folder name; null when cancelled or empty */
export async function askName(title: string, value: string): Promise<string | null> {
    const answer = await askText(title, [{ label: t('files.name'), value, maxLength: 255 }], t('common.ok'));
    return answer === null || answer[0] === '' ? null : answer[0];
}

/** Confirms deleting for good */
export async function askDelete(names: readonly string[]): Promise<boolean> {
    const message = names.length === 1 ? t('files.deleteOne', { name: names[0] }) : t('files.deleteMany', { count: names.length });
    return await askChoice(t('files.delete'), message, [
        { id: 'cancel', label: t('common.cancel') },
        { id: 'delete', label: t('files.delete'), destructive: true, primary: true }
    ]) === 'delete';
}
