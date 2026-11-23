/**
 * Messaggi di errore per l'utente: traduce i codici restituiti dal motore.
 */

import { t, type TextKey } from '../i18n/i18n.js';
import { EngineRequestError } from '../transport/engine-client.js';
import { askChoice } from './ask-choice.js';

// Codici del motore con un messaggio dedicato (codice -> chiave del testo)
const MESSAGES: Record<string, TextKey> = {
    'unsaved-changes': 'errors.unsavedChanges',
    'invalid-name': 'errors.invalidName',
    'show-not-found': 'errors.showNotFound',
    'invalid-show': 'errors.invalidShow',
    'newer-show-format': 'errors.newerShowFormat',
    'template-not-found': 'errors.templateNotFound',
    'template-read-only': 'errors.templateReadOnly',
    'no-show': 'errors.noShow',
    'desktop-only': 'errors.desktopOnly',
    'no-recovery': 'errors.noRecovery',
    'invalid-archive': 'errors.invalidArchive',
    'wrong-archive-kind': 'errors.wrongArchiveKind',
    'media-not-found': 'errors.mediaNotFound',
    'invalid-media-path': 'errors.invalidMediaPath'
};

/**
 * Restituisce il messaggio per l'utente di un errore.
 */
export function errorMessage(error: unknown): string {
    if (error instanceof EngineRequestError && Object.hasOwn(MESSAGES, error.code)) {
        return t(MESSAGES[error.code]);
    }
    return t('errors.generic');
}

/**
 * Mostra un errore all'utente e lo registra in console.
 */
export async function showError(error: unknown): Promise<void> {
    console.error(error);
    await askChoice(t('errors.title'), errorMessage(error), [{ id: 'ok', label: t('common.ok'), primary: true }]);
}
